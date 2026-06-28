import { listQuestions } from "./queries.js";

export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/api/questions") {
      const chapterParam = url.searchParams.get("chapter");
      const topicParam = url.searchParams.get("topic");
      const doubtOnlyParam = url.searchParams.get("doubtOnly");

      const questions = await listQuestions(env.DB, {
        chapter: chapterParam !== null ? parseInt(chapterParam, 10) : undefined,
        topic: topicParam ?? undefined,
        doubtOnly: doubtOnlyParam === "true" || undefined,
      });

      return Response.json(questions);
    }

    return new Response("Not Found", { status: 404 });
  },
};
