import { ChatOpenAI } from "@langchain/openai";
import type { ToolCall } from "@langchain/core/messages";
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import chalk from "chalk";
import {
    searchTool,
    executeCommandTool,
    listDirectoryTool,
    readFileTool,
    writeFileTool,
} from "./tools";

import dotenv from "dotenv";

// 从 .env 中加载模型配置。
dotenv.config();

// 初始化 OpenAI 聊天模型。
const llm = new ChatOpenAI({
    model: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0, // 温度指定为0，不让AI随意发挥。
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

// 收集所有可用工具。
// 这份列表一方面会绑定给模型，让模型知道自己能调用什么；
// 另一方面也作为本地执行白名单，避免模型请求不存在的工具实现。
const tools = [
    searchTool,
    readFileTool,
    writeFileTool,
    executeCommandTool,
    listDirectoryTool,
];

// 绑定工具后，模型可以返回 tool_calls。
const llmWithTools = llm.bindTools(tools);

// 统一格式化未知异常，避免把 Error 对象直接拼进日志或返回值里。
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

// 把模型返回的 content 统一转成字符串，避免数组内容直接回传给调用方。
const getTextContent = (content: AIMessage["content"]): string => {
    if (typeof content === "string") {
        return content;
    }

    const textParts = content
        .filter((part): part is Extract<typeof part, { type: "text"; text: string }> => part.type === "text")
        .map((part) => part.text.trim())
        .filter(Boolean);

    if (textParts.length > 0) {
        return textParts.join("\n");
    }

    return JSON.stringify(content);
};

// 根据 tool_call.name 把请求路由到本地具体实现。
// 这里保留 switch 而不是 find/map 的主要原因是：
// 1. 每个分支都能显式收窄参数类型
// 2. 未知工具可以统一返回稳定错误
// 3. 后续新增工具时，入口位置足够直观
const invokeTool = async (toolCall: ToolCall): Promise<string> => {
    console.log(`[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);

    try {
        switch (toolCall.name) {
            case searchTool.name:
                return String(await searchTool.invoke(toolCall.args as { keywords: string[] }));
            case readFileTool.name:
                return String(await readFileTool.invoke(toolCall.args as { filePath: string }));
            case writeFileTool.name:
                return String(await writeFileTool.invoke(toolCall.args as { filePath: string; content: string }));
            case executeCommandTool.name:
                return String(await executeCommandTool.invoke(toolCall.args as { command: string; workingDirectory?: string }));
            case listDirectoryTool.name:
                return String(await listDirectoryTool.invoke(toolCall.args as { directory?: string }));
            default:
                return `错误: 找不到工具 ${toolCall.name}`;
        }
    } catch (error: unknown) {
        return `错误: 工具 ${toolCall.name} 执行异常: ${getErrorMessage(error)}`;
    }
};

export const runAgentWithTools = async (query: string, maxIterations = 30): Promise<string> => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
        throw new Error("任务描述不能为空，请传入明确的用户需求。");
    }

    if (!Number.isInteger(maxIterations) || maxIterations <= 0) {
        throw new Error("maxIterations 必须是大于 0 的整数。");
    }

    // 初始消息历史由 system + human 组成。
    // 后续每一轮都会把模型回复和工具结果继续追加到 messages 中，
    // 这样模型下一次调用时，能看到完整上下文和前面工具执行结果。
    const messages: BaseMessage[] = [
        new SystemMessage(`
你是一个智能代码管理助手。你的职责是基于真实工具结果完成开发任务，而不是凭空猜测。

当前工作目录：${process.cwd()}

你可以使用这些工具：
- search: 做示例性的关键词查询
- read_file: 读取文件内容
- write_file: 创建目录并写入文件
- execute_command: 执行命令，可指定 workingDirectory
- list_directory: 查看目录内容

工作原则：
1. 先理解任务，再决定是否需要工具。
2. 涉及代码、配置、目录结构、报错排查时，优先用 read_file 或 list_directory 获取真实上下文。
3. 不要编造文件内容、命令结果或任务完成状态；所有结论都必须基于工具返回结果。
4. 如果工具失败，要根据真实错误信息调整策略，而不是盲目重复相同操作。
5. 优先做最直接、最小必要的操作，避免无关改动。

execute_command 规则：
1. workingDirectory 会自动切换执行目录。
2. 一旦传入 workingDirectory，就不要在 command 里再写 cd。
3. 错误示例：{ command: "cd react-app && bun install", workingDirectory: "react-app" }
4. 正确示例：{ command: "bun install", workingDirectory: "react-app" }
5. 执行命令后，要结合退出码、标准输出、标准错误判断下一步。

write_file 规则：
1. 写文件前先确认目标路径和文件用途。
2. 覆盖写入时要保证内容完整，避免只写入局部片段导致文件损坏。
3. 如果修改前需要了解原文件内容，先调用 read_file。

search 规则：
1. search 只是示例工具，不代表真实联网搜索。
2. 只有在确实需要示例查询结果时再使用它。

输出要求：
1. 用简洁中文回答。
2. 优先说明做了什么、结果如何、是否还有阻塞。
3. 不要输出冗长的思维过程。
4. 如果任务无法完成，要明确说明原因。
`),
        new HumanMessage(normalizedQuery),
    ];

    // Agent Loop：
    // 1. 先让模型决定是直接回答，还是发起 tool_calls
    // 2. 如果有工具调用，就执行工具并把结果包装成 ToolMessage 回填
    // 3. 再次把完整消息历史交给模型，进入下一轮推理
    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳(${i + 1}/${maxIterations}) 正在等待 AI 思考...`));
        let response: AIMessage;

        try {
            response = await llmWithTools.invoke(messages);
        } catch (error: unknown) {
            throw new Error(`第 ${i + 1} 轮模型调用失败: ${getErrorMessage(error)}`);
        }

        messages.push(response);

        const toolCalls = response.tool_calls ?? [];
        if (toolCalls.length === 0) {
            // 没有 tool_calls 说明模型认为任务已经可以直接回答，循环在这里收口。
            const finalContent = getTextContent(response.content).trim() || "任务已完成，但模型没有返回可展示的文本结果。";
            console.log(`\n✨ AI 最终回复:\n${finalContent}\n`);
            return finalContent;
        }

        console.log(`\n[检测到 ${toolCalls.length} 个工具调用]`);

        // 当前轮的所有工具都先执行完，再统一回填。
        // 这样可以保证模型下一轮看到的是完整的工具输出，而不是半成品上下文。
        const toolMessages = await Promise.all(
            toolCalls.map(async (toolCall: ToolCall): Promise<ToolMessage> => {
                const toolResult = await invokeTool(toolCall);

                return new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id ?? "",
                });
            })
        );

        messages.push(...toolMessages);
    }

    // 如果连续多轮都在调用工具但任务始终没有收敛，主动抛错而不是静默结束，
    // 方便调用方识别“可能陷入循环”这种异常状态。
    throw new Error(`工具调用超过最大轮次限制 (${maxIterations})，任务可能陷入循环。`);
};
