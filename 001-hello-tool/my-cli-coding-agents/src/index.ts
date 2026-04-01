import { runAgentWithTools } from "./cc";

const main = async (): Promise<void> => {
    const case1 = `创建一个 React + TypeScript 的 TodoMVC 应用，项目名为 react-todomvc-app，使用 bun 和 Vite。

任务要求：
1. 如果项目不存在，先创建 Vite React TypeScript 项目；如命令需要交互，请自动处理。
2. 实现完整 TodoMVC 功能：
   - 添加、删除、编辑待办事项
   - 标记完成 / 取消完成
   - 全部、进行中、已完成筛选
   - 显示剩余数量
   - 使用 localStorage 做数据持久化
3. 完善界面样式：
   - 美观的卡片式布局
   - 渐变背景、圆角、阴影、悬停效果
4. 添加基础动画：
   - 新增和删除待办时有过渡动画
   - 使用 CSS transitions
5. 修改完成后，确认关键文件内容正确。
6. 如项目尚未安装依赖，则执行 bun install。
7. 最后尝试使用 bun run dev 启动项目，确认应用可以运行。`;

    await runAgentWithTools(case1);
};

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[启动失败]", message);
    process.exitCode = 1;
});
