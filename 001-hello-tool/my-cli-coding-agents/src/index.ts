import { runOpenAI } from "./openai";

const main = async (): Promise<void> => {
    await runOpenAI();
};

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[启动失败]", message);
    process.exitCode = 1;
});