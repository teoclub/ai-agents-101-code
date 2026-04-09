import { ChatAnthropic } from "@langchain/anthropic";
import { tool } from "@langchain/core/tools";
import {
    AIMessage,
    BaseMessage,
    SystemMessage,
    ToolMessage,
} from "@langchain/core/messages";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import dotenv from "dotenv";
import z from "zod";

dotenv.config({ override: true, quiet: true });

// 1) 初始化模型
const llm = new ChatAnthropic({
    model: process.env.MODEL_NAME,
    temperature: 0,
    maxTokens: 8_000,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicApiUrl: process.env.ANTHROPIC_BASE_URL,
});

const execAsync = promisify(exec);

export type LoopState = {
    messages: BaseMessage[];
};

// 2) 工具：执行 bash 命令
export const bashTool = tool(
    async ({ command }: { command: string }): Promise<string> => {
        console.log(`$ ${command}`);
        const output = await execAsync(command, {
            cwd: process.cwd(),
            timeout: 120_000,
            env: process.env,
        })
            .then(({ stdout, stderr }) => `${stdout}${stderr}`)
            .catch((e: any) => {
                console.error(e);
                return String(e?.stderr ?? e?.message ?? e);
            });
        return output.trim() || "(no output)";
    },
    {
        name: "bash",
        description: "Run a shell command in the current workspace.",
        schema: z.object({
            command: z.string(),
        }),
    }
);

const llmWithTools = llm.bindTools([bashTool]);

// 3) 一轮：模型回复 -> 执行工具 -> 回填 tool_result
export const run_one_turn = async (state: LoopState): Promise<boolean> => {
    const response = (await llmWithTools.invoke([
        new SystemMessage(`You are a coding agent at ${process.cwd()}. Use bash to inspect and change the workspace. Act first, then report clearly.`),
        ...state.messages,
    ])) as AIMessage;

    state.messages.push(response);

    if (!response.tool_calls?.length) return false;

    for (const toolCall of response.tool_calls) {
        state.messages.push(
            new ToolMessage({
                tool_call_id: toolCall.id ?? "",
                content: String(await bashTool.invoke(toolCall.args as { command: string })),
            })
        );
    }

    return true;
};

// 4) 多轮：直到模型不再请求工具
export const agent_loop = async (state: LoopState): Promise<void> => {
    while (true) {
        if (!(await run_one_turn(state))) break;
    }
};
