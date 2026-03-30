import { ChatOpenAI } from "@langchain/openai";
import { tool } from "@langchain/core/tools";
import dotenv from "dotenv";
import z from "zod";
import {
    AIMessage,
    BaseMessage,
    HumanMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages";

// 从 .env 中加载模型配置。
dotenv.config();

// 初始化 OpenAI 聊天模型。
const llm = new ChatOpenAI({
    model: process.env.MODEL_NAME,
    apiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    configuration: {
        baseURL: process.env.OPENAI_BASE_URL,
    },
});

// 示例搜索工具：这里只返回拼接后的文本，方便演示工具调用流程。
const searchTool = tool(
    ({ query }: { query: string }): string => `搜索结果: ${query}`,
    {
        name: "search",
        description: "搜索信息。",
        schema: z.object({ query: z.string() }),
    }
);

// 文件读取工具：让模型先读文件，再根据内容解释代码。
const readFileTool = tool(
    async ({ filePath }: { filePath: string }): Promise<string> => {
        const file = Bun.file(filePath, { type: "text/plain;charset=utf-8" });
        const content = await file.text();

        console.log(`[工具调用] read_file("${filePath}" ==> 成功读取 ${file.size}) 字节`);
        return `文件内容: \n${content}`;
    },
    {
        name: "read_file",
        description: "读取文件内容。输入文件路径（可以是相对路径或绝对路径）。",
        schema: z.object({
            filePath: z.string().describe("要读取的文件路径"),
        }),
    }
);

// 收集所有可用工具，后续既绑定给模型，也用于本地执行。
const tools = [
    searchTool,
    readFileTool
];

// 绑定工具后，模型可以返回 tool_calls。
const llmWithTools = llm.bindTools(tools);

// 把 unknown 错误统一转成字符串，便于直接返回给模型或打印日志。
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};
// 根据模型给出的 tool name，分发到本地对应实现。
const invokeTool = async (toolCall: ToolCall): Promise<string> => {
    console.log(`[执行工具] ${toolCall.name}(${JSON.stringify(toolCall.args)})`);

    try {
        switch (toolCall.name) {
            case searchTool.name:
                return String(await searchTool.invoke(toolCall.args as { query: string }));
            case readFileTool.name:
                return String(await readFileTool.invoke(toolCall.args as { filePath: string }));
            default:
                return `错误: 找不到工具 ${toolCall.name}`;
        }
    } catch (error: unknown) {
        return `错误: ${getErrorMessage(error)}`;
    }
};

// 运行 OpenAI + 工具调用示例。
export const runOpenAI = async (): Promise<void> => {
    // 初始消息：system 规定工具使用策略，human 给出具体任务。
    const messages: BaseMessage[] = [
        new SystemMessage(`
你是一个代码助手，可以使用工具读取文件并解释代码。

工作流程：
1. 用户要求读取文件时，立即调用 read_file 工具
2. 等待工具返回文件内容
3. 基于文件内容进行分析和解释

可用工具：
- search: 查询内容
- read_file: 读取文件内容（使用此工具来获取文件内容）     
    `),
        new HumanMessage("请读取 ./src/openai.ts 文件内容并解释代码"),
    ];

    // 先让模型决定当前是否需要调用工具。
    let response: AIMessage = await llmWithTools.invoke(messages);

    // 处理多轮工具调用，直到模型不再返回 tool_calls。
    while (true) {
        messages.push(response);

        const toolCalls = response.tool_calls ?? [];
        if (toolCalls.length === 0) {
            break;
        }

        console.log(`\n[检测到 ${toolCalls.length} 个工具被调用]`);

        const toolResults = await Promise.all(
            toolCalls.map((toolCall: ToolCall): Promise<string> => invokeTool(toolCall))
        );

        // 把工具执行结果包装成 ToolMessage，回填给模型继续推理。
        toolCalls.forEach((toolCall: ToolCall, index: number) => {
            messages.push(
                new ToolMessage({
                    content: toolResults[index],
                    tool_call_id: toolCall.id ?? "",
                })
            );
        });

        // 再次调用大模型，基于工具输出结果，生成下一轮回复。
        response = await llmWithTools.invoke(messages);
    }

    console.log("\n[最终回复]");
    console.log(response.content);
};
