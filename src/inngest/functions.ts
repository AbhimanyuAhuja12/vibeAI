import { inngest } from "./client";
import { gemini, createAgent, createTool, createNetwork } from "@inngest/agent-kit";
import { Sandbox } from "@e2b/code-interpreter";
import { getSandbox, lastAssistantTextMessageContent } from "./utils";
import { z } from "zod";
import { PROMPT } from "@/prompt";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },

  async ({ event, step }) => {
    const sandboxId = await step.run("get-sandbox-id", async () => {
      const sandbox = await Sandbox.create("vibe-nextjs-test-dev");
      return sandbox.sandboxId;
    });

    // Create a new agent with a system prompt using Gemini
    const codeAgent = createAgent({
      name: "codeAgent",
      description: "An Expert coding Agent",
      system: PROMPT,
      model: gemini({
        model: "gemini-1.5-flash",
      }),
      tools: [
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { step }) => {
            return await step?.run("terminal", async () => {
              const buffers = { stdout: "", stderr: "" };

              try {
                const sandbox = await getSandbox(sandboxId);
                const result = await sandbox.commands.run(command, {
                  onStdout: (data: string) => {
                    buffers.stdout += data;
                  },
                  onStderr: (data: string) => {
                    buffers.stderr += data;
                  },
                });
                return result.stdout || buffers.stdout;
              } catch (e) {
                const errorMessage = `Command failed: ${e}\nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
                console.error(errorMessage);
                return errorMessage;
              }
            });
          },
        }),
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),
          handler: async ({ files }, { step, network }) => {
            const newFiles = await step?.run(
              "createOrUpdateFiles",
              async () => {
                try {
                  const updatedFiles = network?.state?.data?.files || {};
                  const sandbox = await getSandbox(sandboxId);

                  for (const file of files) {
                    await sandbox.files.write(file.path, file.content);
                    updatedFiles[file.path] = file.content;
                  }

                  return updatedFiles;
                } catch (e) {
                  console.error("Error creating/updating files:", e);
                  return { error: `Error: ${e}` };
                }
              }
            );

            if (
              typeof newFiles === "object" &&
              !newFiles.error &&
              network?.state?.data
            ) {
              network.state.data.files = newFiles;
            }

            return newFiles;
          },
        }),
        createTool({
          name: "readFiles",
          description: "Read files from the sandbox",
          parameters: z.object({
            files: z.array(z.string()),
          }),
          handler: async ({ files }, { step }) => {
            return await step?.run("readFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const contents: { [key: string]: string } = {};

                for (const filePath of files) {
                  try {
                    const content = await sandbox.files.read(filePath);
                    contents[filePath] = content;
                  } catch (fileError) {
                    console.error(`Error reading file ${filePath}:`, fileError);
                    contents[filePath] = `Error reading file: ${fileError}`;
                  }
                }

                return contents;
              } catch (error) {
                console.error("Error in readFiles:", error);
                return { error: `Failed to read files: ${error}` };
              }
            });
          },
        }),
        createTool({
          name: "listFiles",
          description: "List files and directories in the sandbox",
          parameters: z.object({
            path: z.string().optional().default("."),
          }),
          handler: async ({ path }, { step }) => {
            return await step?.run("listFiles", async () => {
              try {
                const sandbox = await getSandbox(sandboxId);
                const files = await sandbox.files.list(path);
                return files;
              } catch (error) {
                console.error("Error listing files:", error);
                return { error: `Failed to list files: ${error}` };
              }
            });
          },
        }),
      ],
      lifecycle: {
        onResponse: async ({ result, network }) => {
          const lastAssistantTextMessageText = lastAssistantTextMessageContent(result);

          if (lastAssistantTextMessageText && network) {
            if (lastAssistantTextMessageText.includes("<task_summary>")) {
              network.state.data.summary = lastAssistantTextMessageText;
            }
          }
          return result;
        },
      },
    });

    const network = createNetwork({
      name:"coding-agent-network",
      agents : [codeAgent],
      maxIter:15,
      router : async({network})=>{
        const summary = network.state.data.summary;

        if(summary){
          return;
        }
        return codeAgent;
      }
    })

     const result = await network.run(
      `Write the following snippet: ${event.data.value}`
    );

    const sandboxUrl = await step.run("get-sandbox-url", async () => {
      try {
        const sandbox = await getSandbox(sandboxId);
        const host = sandbox.getHost(3000);
        return `https://${host}`;
      } catch (error) {
        console.error("Error getting sandbox URL:", error);
        return null;
      }
    });

    return {
      url: sandboxUrl || "URL unavailable",
      title:"fragment",
      files : result.state.data.files,
      summary: result.state.data.summary,
    };
  }
);