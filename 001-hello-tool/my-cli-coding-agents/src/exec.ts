import { spawn } from "node:child_process";

type CommandResult = {
    stdout: string;
    stderr: string;
    exitCode: number;
};

export const runCommand = async (
    command: string,
    workingDirectory: string = process.cwd()
): Promise<CommandResult> => {
    // 优先复用用户当前的 shell，避免和终端里的 PATH / alias / rc 配置不一致。
    const shell = process.env.SHELL ?? "/bin/zsh";

    return new Promise<CommandResult>((resolve, reject) => {
        // spawn 可以指定在 cwd 这个目录下执行命令，会创建一个子进程来跑，这也是为啥这个模块叫 child_process
        // 只显式启动一层 login shell，让整段命令按用户熟悉的 shell 规则解析。
        // 如果同时再设置 shell: true，Node 会额外包一层 /bin/sh，容易改变引号和分号的语义。
        const child = spawn(shell, ["-lc", command], {
            cwd: workingDirectory,
            env: { ...process.env },
            // stdin 透传给父进程，stdout / stderr 单独收集，便于上层决定怎么展示结果。
            stdio: ["inherit", "pipe", "pipe"],
        });

        let stdout = "";
        let stderr = "";

        child.stdout?.setEncoding("utf8");
        child.stderr?.setEncoding("utf8");

        child.stdout?.on("data", (chunk: string) => {
            stdout += chunk;
        });

        child.stderr?.on("data", (chunk: string) => {
            stderr += chunk;
        });

        // error 表示子进程连启动都失败了，例如 shell 路径不存在或权限不足。
        child.on("error", (error: Error) => {
            reject(error);
        });

        // 非零退出码仍然 resolve，让调用方可以结合 stdout / stderr / exitCode 自己决定如何处理失败。
        child.on("close", (code: number | null) => {
            if (code === 0) {
                console.log(`  [工具调用] execute_command("${command}") - 执行成功`);
            } else {
                console.log(`  [工具调用] execute_command("${command}") - 执行失败，退出码: ${code}`);
            }

            resolve({
                stdout,
                stderr,
                exitCode: code ?? 1,
            });

        });
    });
};

// 允许单独运行这个文件，快速验证命令执行逻辑。
if (import.meta.main) {
    // const command = "ls -la";

    // echo 两个 n 是有时候 vite 会让你选择两个选项：安不安装依赖 或 用不用rolldownn; echo n 然后通过管道操作符输出给那个进程就和我们键盘输入 n 一样的效果。
    const command = 'echo -e "n\nn" | bun create vite react-counter-app --template react-ts';
    const result = await runCommand(command);
    console.log(result);
}
