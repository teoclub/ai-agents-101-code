import { HumanMessage } from "@langchain/core/messages";
import { agent_loop, type LoopState } from "./agent_loop";

const getText = (content: unknown): string => {
    if (typeof content === "string") return content.trim();
    if (!Array.isArray(content)) return "";
    return content
        .map((block) => (typeof block === "string" ? block : String((block as { text?: string }).text ?? "")))
        .join("\n")
        .trim();
};

// CLI 入口：读取用户问题，启动 agent_loop。
const main = async (): Promise<void> => {
    const state: LoopState = {
        messages: [new HumanMessage("创建 react + vite 脚手架")],
    };

    await agent_loop(state);

    // 打印最后一条 assistant 消息文本。
    const final = state.messages.at(-1);
    const text = final ? getText(final.content) : "";
    if (text) {
        console.log(text);
    }
};

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[启动失败]", message);
    process.exitCode = 1;
});
