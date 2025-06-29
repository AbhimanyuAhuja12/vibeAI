import { inngest } from "./client";
import { gemini, createAgent } from "@inngest/agent-kit";

export const helloWorld = inngest.createFunction(
  { id: "hello-world" },
  { event: "test/hello.world" },

  async ({ event }) => {
    // Create a new agent with a system prompt using Gemini
    const codeAgent = createAgent({
      name: "codeAgent",
      system: "You are an expert next.js developer . you write readable, maintanable code. You write simple Next.js and React snippets , you have write code",
      model: gemini({
        model: "gemini-1.5-flash", // or "gemini-1.5-flash" for faster responses
      }),
    });

    const { output } = await codeAgent.run(
      `Write the following snippet ${event.data.value}`
    );
    console.log(output);

    return { output };
  }
);
