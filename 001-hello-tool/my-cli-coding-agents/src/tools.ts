import { tool } from "@langchain/core/tools";
import fs from "node:fs/promises";
import path from "node:path";
import z from "zod";
import { runCommand } from "./exec";

// 统一格式化异常信息，避免工具实现里重复写 Error 判断逻辑。
// 返回纯字符串后，既可以直接回给模型，也方便输出到控制台日志。
const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};

// 一个示例型搜索工具。
// 这里没有接真实搜索服务，而是把输入关键词规范化后拼成演示结果，
// 方便先把工具调用链路跑通，再替换成真实实现。
const searchTool = tool(
    ({ keywords }: { keywords: string[] }): string => {
        const normalizedKeywords = keywords.map((keyword) => keyword.trim()).filter(Boolean);

        if (normalizedKeywords.length === 0) {
            return "关键词搜索结果: 未提供有效关键词";
        }

        return [
            `关键词搜索结果: ${normalizedKeywords.join("、")}`,
            ...normalizedKeywords.map((keyword, index) => `${index + 1}. 与“${keyword}”相关的示例结果`),
        ].join("\n");
    },
    {
        name: "search",
        description: "根据关键词数组查询相关信息。",
        schema: z.object({
            keywords: z.array(z.string()).describe("要查询的关键词列表"),
        }),
    }
);

// 读取文件工具：读取单个文件内容。
// 适合让模型在回答代码相关问题前，先基于真实文件内容建立上下文。
const readFileTool = tool(
    async ({ filePath }: { filePath: string }): Promise<string> => {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            console.log(`  [工具调用] read_file("${filePath}") - 成功读取 ${content.length} 字节`);
            return `文件内容:\n${content}`;
        } catch (error: unknown) {
            console.log(`  [工具调用] read_file("${filePath}") - 错误: ${getErrorMessage(error)}`);
            return `读取文件失败: ${getErrorMessage(error)}`;
        }
    },
    {
        name: "read_file",
        description: "读取文件内容。输入文件路径（可以是相对路径或绝对路径）。",
        schema: z.object({
            filePath: z.string().describe("要读取的文件路径"),
        }),
    }
);

// 写入文件工具：向指定路径写入文件内容。
// 写入前会自动创建父目录，这样模型不需要额外再调用 mkdir 一类的命令。
const writeFileTool = tool(
    async ({ filePath, content }: { filePath: string, content: string }): Promise<string> => {
        try {
            // 先确保目标目录存在，再执行写入，减少“目录不存在”的失败场景。
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });

            await fs.writeFile(filePath, content, "utf-8");
            console.log(`  [工具调用] write_file("${filePath}") - 成功写入 ${content.length} 字节`);
            return `文件写入成功: ${filePath}`;
        } catch (error) {
            console.log(`  [工具调用] write_file("${filePath}") - 错误: ${getErrorMessage(error)}`);
            return `写入文件失败: ${getErrorMessage(error)}`;
        }
    },
    {
        name: "write_file",
        description: "向指定路径写入文件内容",
        schema: z.object({
            filePath: z.string().describe("要写入的文件路径"),
            content: z.string().describe("要写入的内容"),
        }),
    }
);

// 执行命令工具：执行 shell 命令。
// 工具会保留 stdout、stderr 和退出码语义，让上层能区分“命令执行失败”和“命令成功但无输出”。
const executeCommandTool = tool(
    async ({ command, workingDirectory }: { command: string, workingDirectory?: string }): Promise<string> => {
        try {
            const result = await runCommand(command, workingDirectory);

            // 非零退出码按失败处理，但仍然把标准输出和标准错误一并返回，便于诊断问题。
            if (result.exitCode !== 0) {
                return [
                    `命令执行失败，退出码: ${result.exitCode}`,
                    result.stdout ? `标准输出:\n${result.stdout}` : "",
                    result.stderr ? `标准错误:\n${result.stderr}` : "",
                ]
                    .filter(Boolean)
                    .join("\n\n");
            }

            return [
                "命令执行成功",
                result.stdout ? `标准输出:\n${result.stdout}` : "",
                result.stderr ? `标准错误:\n${result.stderr}` : "",
            ]
                .filter(Boolean)
                .join("\n\n");
        } catch (error: unknown) {
            return `命令执行失败: ${getErrorMessage(error)}`;
        }
    },
    {
        name: "execute_command",
        description: "执行系统命令，支持指定工作目录，实时显示输出",
        schema: z.object({
            command: z.string().describe("要执行的命令"),
            workingDirectory: z.string().optional().describe("命令执行所在目录，默认为当前目录"),
        }),
    }
);

// 列出目录内容工具：列出目录下的一级文件和文件夹。
// 默认读取当前目录，适合作为模型探索项目结构时的轻量入口。
const listDirectoryTool = tool(
    async ({ directory }: { directory?: string }): Promise<string> => {
        try {
            const files = await fs.readdir(directory || ".");
            return `目录内容:\n${files.map(f => `- ${f}`).join("\n")}`;
        } catch (error) {
            return `读取目录失败: ${getErrorMessage(error)}`;
        }
    },
    {
        name: "list_directory",
        description: "列出目录内容",
        schema: z.object({
            directory: z.string().optional().describe("目录路径，默认为当前目录"),
        }),
    }
);

export {
    searchTool,
    readFileTool,
    writeFileTool,
    executeCommandTool,
    listDirectoryTool,
}
