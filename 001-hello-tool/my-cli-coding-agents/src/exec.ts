import { spawn, type ChildProcess } from "node:child_process";

type CommandResult = {
    stdout: string;
    stderr: string;
    exitCode: number;
};

export const runCommand = async (
    command: string,
    workingDirectory?: string
): Promise<CommandResult> => {
    // 没传工作目录时回退到当前进程目录，避免调用方必须显式传 process.cwd()。
    const cwd = workingDirectory || process.cwd();
    console.log(`[工具调用] execute_command("${command}")${workingDirectory ? ` - 工作目录: ${workingDirectory}` : ''}`);

    return new Promise<CommandResult>((resolve, reject) => {
        // 这里先做一个最轻量的拆分，让 "ls -la" 这类简单命令能直接交给 spawn。
        const [cmd = '', ...args] = command.split(' ');

        // shell: true 让管道、重定向等 shell 语法可用；ChildProcess 断言是为了兼容当前类型推断。
        const child = spawn(cmd, args, {
            cwd,
            env: { ...process.env },
            stdio: "inherit", // 实时输出到控制台
            shell: true,
        }) as unknown as ChildProcess;

        let errMsg = "";

        // error 表示子进程本身没能正常启动，不是“命令执行后返回非零退出码”的那种失败。
        child.on("error", (error: Error) => {
            errMsg = error.message;
        });

        // close 一定会在子进程结束后触发，这里统一把退出码整理成工具层需要的结果结构。
        child.on("close", (code: number | null) => {
            if (code === 0) {
                console.log(`  [工具调用] execute_command("${command}") - 执行成功`);
                resolve({
                    stdout: "",
                    stderr: "",
                    exitCode: 0,
                });
            } else {
                console.log(`  [工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`);
                resolve({
                    stdout: "",
                    stderr: errMsg ? `错误: ${errMsg}` : "",
                    exitCode: code ?? 1,
                });
            }
        });
    });
};

// 允许单独运行这个文件，快速验证命令执行逻辑。
if (import.meta.main) {
    // const command = "ls -la";

    // echo 两个 n 是有时候 vite 会让你选择两个选项：安不安装依赖 或 用不用rolldownn; echo n 然后通过管道操作符输出给那个进程就和我们键盘输入 n 一样的效果。
    const command = 'echo -e "n\nn" | bun create vite react-counter-app --template react-ts';
    const result = await runCommand(command, process.cwd());
    console.log(result);
}
