# Emma Chatbot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready AI chatbot web app where users log in with Google and chat with a magical-girl character named Emma, with persistent per-user conversation history stored in MongoDB.

**Architecture:** Next.js App Router monolith deployed to Cloud Run. Hono handles API routes mounted at `/api/[[...route]]`, Auth.js v5 manages Google OAuth with JWT sessions, Mastra wraps the OpenAI gpt-4o-mini call, and Prisma talks to MongoDB Atlas. One Docker container, one Cloud Run service.

**Tech Stack:** Next.js 15 (App Router), Hono, Auth.js v5 (next-auth@beta), Prisma 6 (MongoDB), Mastra (@mastra/core), OpenAI gpt-4o-mini via @ai-sdk/openai, Vitest + Testing Library for tests, Docker, Google Cloud Run.

---

## File Map

```
magica-chat/
├── app/
│   ├── api/
│   │   └── [[...route]]/
│   │       └── route.ts          # Hono mount (GET/POST/DELETE)
│   ├── auth/
│   │   └── [...nextauth]/
│   │       └── route.ts          # Auth.js route handler
│   ├── chat/
│   │   └── page.tsx              # /chat server component (auth guard)
│   ├── layout.tsx                # Root layout with SessionProvider
│   ├── page.tsx                  # Login page (server component)
│   └── globals.css               # Global styles + CSS variables
├── components/
│   ├── LoginPage.tsx             # Login UI (client component)
│   ├── ChatPage.tsx              # Chat UI root (client component)
│   ├── MessageList.tsx           # Scrollable message bubbles
│   ├── MessageInput.tsx          # Textarea + send button
│   └── Toast.tsx                 # Error toast notification
├── lib/
│   ├── auth.ts                   # Auth.js config (providers, callbacks, JWT)
│   ├── db.ts                     # Prisma client singleton
│   └── mastra/
│       ├── index.ts              # Mastra instance export
│       └── emma-agent.ts         # Emma agent definition + system prompt
├── server/
│   └── api/
│       ├── index.ts              # Hono app with basePath /api
│       └── chat.ts               # Chat route handlers (POST + DELETE)
├── middleware.ts                 # Auth.js middleware (protects /chat)
├── prisma/
│   └── schema.prisma
├── public/
│   └── images/
│       └── emma-icon.png         # Character icon (place file here)
├── Dockerfile
├── .dockerignore
├── .env.local                    # gitignored — see Task 1 for template
└── package.json
```

---

## Task 1: Project Initialization

**Files:**

- Create: `package.json`
- Create: `.env.local`
- Create: `tsconfig.json`
- Create: `next.config.ts`

- [ ] **Step 1: Initialize Next.js project**

```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --app \
  --src-dir=no \
  --import-alias="@/*" \
  --no-git
```

Accept all defaults. This creates `app/`, `public/`, `tailwind.config.ts`, etc.

- [ ] **Step 2: Install dependencies**

```bash
npm install hono @hono/node-server next-auth@beta \
  @auth/prisma-adapter @prisma/client \
  @mastra/core @ai-sdk/openai \
  sonner

npm install --save-dev prisma vitest @vitejs/plugin-react \
  @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom
```

- [ ] **Step 3: Create `.env.local` template**

Create `.env.local` (already gitignored by default Next.js setup):

```env
AUTH_SECRET=replace_with_random_32char_string
AUTH_GOOGLE_ID=replace_with_google_client_id
AUTH_GOOGLE_SECRET=replace_with_google_client_secret
OPENAI_API_KEY=replace_with_openai_key
DATABASE_URL=mongodb+srv://user:pass@cluster.mongodb.net/emma-chatbot?retryWrites=true&w=majority
```

Generate `AUTH_SECRET` with: `openssl rand -base64 32`

- [ ] **Step 4: Add Vitest config**

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
});
```

Create `vitest.setup.ts`:

```typescript
import "@testing-library/jest-dom";
```

- [ ] **Step 5: Add test script to package.json**

In `package.json`, add to `"scripts"`:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "chore: initialize Next.js project with dependencies"
```

---

## Task 2: Prisma Schema + DB Client

**Files:**

- Create: `prisma/schema.prisma`
- Create: `lib/db.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/db.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => {
  const PrismaClient = vi.fn(() => ({ $connect: vi.fn() }));
  return { PrismaClient };
});

describe("db singleton", () => {
  it("exports a PrismaClient instance", async () => {
    const { db } = await import("../db");
    expect(db).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/__tests__/db.test.ts
```

Expected: FAIL — `Cannot find module '../db'`

- [ ] **Step 3: Initialize Prisma**

```bash
npx prisma init --datasource-provider mongodb
```

This creates `prisma/schema.prisma` and adds `DATABASE_URL` handling.

- [ ] **Step 4: Write the Prisma schema**

Replace `prisma/schema.prisma` with:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mongodb"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(auto()) @map("_id") @db.ObjectId
  email     String    @unique
  name      String
  image     String
  createdAt DateTime  @default(now())
  messages  Message[]
}

model Message {
  id        String   @id @default(auto()) @map("_id") @db.ObjectId
  userId    String   @db.ObjectId
  user      User     @relation(fields: [userId], references: [id])
  role      String
  content   String
  createdAt DateTime @default(now())
}
```

- [ ] **Step 5: Generate Prisma client**

```bash
npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 6: Create the db singleton**

Create `lib/db.ts`:

```typescript
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test lib/__tests__/db.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma lib/db.ts lib/__tests__/db.test.ts
git commit -m "feat: add Prisma schema and db singleton for MongoDB"
```

---

## Task 3: Auth.js Configuration

**Files:**

- Create: `lib/auth.ts`
- Create: `middleware.ts`
- Create: `app/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/auth.test.ts`:

```typescript
import { describe, it, expect, vi } from "vitest";

vi.mock("@prisma/client", () => ({
  PrismaClient: vi.fn(() => ({
    user: { upsert: vi.fn().mockResolvedValue({ id: "user-1" }) },
  })),
}));

vi.mock("next-auth", () => ({
  default: vi.fn((config) => ({
    config,
    handlers: {},
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
}));

vi.mock("next-auth/providers/google", () => ({
  default: vi.fn(() => ({ id: "google" })),
}));

describe("auth config", () => {
  it("exports handlers, auth, signIn, signOut", async () => {
    const mod = await import("../auth");
    expect(mod.handlers).toBeDefined();
    expect(mod.auth).toBeDefined();
    expect(mod.signIn).toBeDefined();
    expect(mod.signOut).toBeDefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/__tests__/auth.test.ts
```

Expected: FAIL — `Cannot find module '../auth'`

- [ ] **Step 3: Create auth config**

Create `lib/auth.ts`:

```typescript
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;
      await db.user.upsert({
        where: { email: user.email },
        update: { name: user.name ?? "", image: user.image ?? "" },
        create: {
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? "",
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await db.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) token.userId = dbUser.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) session.user.id = token.userId as string;
      return session;
    },
  },
});
```

- [ ] **Step 4: Create Auth.js route handler**

Create `app/auth/[...nextauth]/route.ts`:

```typescript
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
```

- [ ] **Step 5: Create middleware for route protection**

Create `middleware.ts` at project root:

```typescript
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname === "/chat") {
    return NextResponse.redirect(new URL("/", req.url));
  }
});

export const config = {
  matcher: ["/chat"],
};
```

- [ ] **Step 6: Extend next-auth types**

Create `types/next-auth.d.ts`:

```typescript
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: { id: string } & DefaultSession["user"];
  }
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test lib/__tests__/auth.test.ts
```

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add lib/auth.ts middleware.ts app/auth lib/__tests__/auth.test.ts types/
git commit -m "feat: add Auth.js v5 with Google OAuth and JWT sessions"
```

---

## Task 4: Emma Agent (Mastra + OpenAI)

**Files:**

- Create: `lib/mastra/emma-agent.ts`
- Create: `lib/mastra/index.ts`

- [ ] **Step 1: Write the failing test**

Create `lib/mastra/__tests__/emma-agent.test.ts`:

```typescript
import { describe, it, expect } from "vitest";

describe("emma agent", () => {
  it("exports an Agent with name Emma", async () => {
    const { emmaAgent } = await import("../emma-agent");
    expect(emmaAgent).toBeDefined();
    expect(emmaAgent.name).toBe("Emma");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test lib/mastra/__tests__/emma-agent.test.ts
```

Expected: FAIL — `Cannot find module '../emma-agent'`

- [ ] **Step 3: Create Emma agent definition**

Create `lib/mastra/emma-agent.ts`:

```typescript
import { Agent } from "@mastra/core/agent";
import { openai } from "@ai-sdk/openai";

export const emmaAgent = new Agent({
  name: "Emma",
  instructions: `あなたは明るくてちょっとドジな魔法少女「エマ」です。
以下のルールを必ず守って会話してください。

- 語尾に「〜だよ」「〜だね」「〜かな」などを使い、親しみやすい口調で話す
- ときどき失敗談やドジなエピソードを交える（例：「あ、また呪文を間違えちゃったかも」）
- 魔法の話題が得意で、会話に ✨🌸 などの絵文字をちりばめる
- ユーザーを温かく励ます
- 暴力・差別・性的な内容など不適切なトピックには「えっと、それはちょっと…🌸」と断る
- 日本語で会話する`,
  model: openai("gpt-4o-mini"),
});
```

- [ ] **Step 4: Create Mastra instance**

Create `lib/mastra/index.ts`:

```typescript
import { Mastra } from "@mastra/core";
import { emmaAgent } from "./emma-agent";

export const mastra = new Mastra({
  agents: { emma: emmaAgent },
});

export { emmaAgent };
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test lib/mastra/__tests__/emma-agent.test.ts
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/mastra/
git commit -m "feat: add Emma AI agent with Mastra and gpt-4o-mini"
```

---

## Task 5: Hono API — Chat Routes

**Files:**

- Create: `server/api/chat.ts`
- Create: `server/api/index.ts`
- Create: `app/api/[[...route]]/route.ts`

- [ ] **Step 1: Write the failing test**

Create `server/api/__tests__/chat.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";

const mockFindMany = vi.fn().mockResolvedValue([]);
const mockCreate = vi.fn().mockResolvedValue({});
const mockDeleteMany = vi.fn().mockResolvedValue({ count: 0 });
const mockFindUnique = vi.fn().mockResolvedValue({ id: "user-1" });

vi.mock("@/lib/db", () => ({
  db: {
    message: {
      findMany: mockFindMany,
      create: mockCreate,
      deleteMany: mockDeleteMany,
    },
    user: { findUnique: mockFindUnique },
  },
}));

const mockStream = vi.fn().mockResolvedValue({
  toDataStreamResponse: vi
    .fn()
    .mockReturnValue(new Response("ok", { status: 200 })),
});

vi.mock("@/lib/mastra", () => ({
  emmaAgent: { stream: mockStream },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi
    .fn()
    .mockResolvedValue({ user: { id: "user-1", email: "test@example.com" } }),
}));

describe("DELETE /api/chat", () => {
  it("returns 401 when not authenticated", async () => {
    const { auth } = await import("@/lib/auth");
    vi.mocked(auth).mockResolvedValueOnce(null);

    const { chatRoutes } = await import("../chat");
    const app = new Hono().route("/chat", chatRoutes);
    const res = await app.request("/chat", { method: "DELETE" });
    expect(res.status).toBe(401);
  });

  it("deletes messages and returns 200 when authenticated", async () => {
    const { chatRoutes } = await import("../chat");
    const app = new Hono().route("/chat", chatRoutes);
    const res = await app.request("/chat", { method: "DELETE" });
    expect(mockDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    });
    expect(res.status).toBe(200);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test server/api/__tests__/chat.test.ts
```

Expected: FAIL — `Cannot find module '../chat'`

- [ ] **Step 3: Create chat route handlers**

Create `server/api/chat.ts`:

```typescript
import { Hono } from "hono";
import { stream } from "hono/streaming";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { emmaAgent } from "@/lib/mastra";

export const chatRoutes = new Hono();

chatRoutes.post("/", async (c) => {
  const session = await auth();
  if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401);

  const { message } = await c.req.json<{ message: string }>();
  if (!message?.trim()) return c.json({ error: "Message required" }, 400);

  const userId = session.user.id;

  const history = await db.message.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });

  await db.message.create({
    data: { userId, role: "user", content: message },
  });

  const messages = [
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: message },
  ];

  const result = await emmaAgent.stream(messages);

  let assistantContent = "";

  return stream(c, async (s) => {
    const response = result.toDataStreamResponse();
    const reader = response.body?.getReader();
    if (!reader) return;

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      assistantContent += chunk;
      await s.write(chunk);
    }

    await db.message.create({
      data: { userId, role: "assistant", content: assistantContent },
    });
  });
});

chatRoutes.delete("/", async (c) => {
  const session = await auth();
  if (!session?.user?.id) return c.json({ error: "Unauthorized" }, 401);

  await db.message.deleteMany({ where: { userId: session.user.id } });
  return c.json({ ok: true });
});
```

- [ ] **Step 4: Create Hono app**

Create `server/api/index.ts`:

```typescript
import { Hono } from "hono";
import { chatRoutes } from "./chat";

const app = new Hono().basePath("/api");

app.route("/chat", chatRoutes);

export default app;
```

- [ ] **Step 5: Mount Hono in Next.js**

Create `app/api/[[...route]]/route.ts`:

```typescript
import { handle } from "hono/vercel";
import app from "@/server/api";

export const runtime = "nodejs";

export const GET = handle(app);
export const POST = handle(app);
export const DELETE = handle(app);
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test server/api/__tests__/chat.test.ts
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add server/ app/api/
git commit -m "feat: add Hono API routes for chat (POST stream + DELETE reset)"
```

---

## Task 6: Login Page

**Files:**

- Create: `components/LoginPage.tsx`
- Modify: `app/page.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Set up CSS variables**

Replace the `:root` block in `app/globals.css` with:

```css
:root {
  --bg: #12091e;
  --hero: #2d1848;
  --user-bubble: #3d2060;
  --accent: #e879a0;
  --text: #ffd6e8;
  --subtext: #c9a0c0;
  --emma-bubble: rgba(45, 24, 72, 0.27);
  --emma-border: rgba(232, 121, 160, 0.13);
  --input-bg: rgba(45, 24, 72, 0.27);
  --input-border: rgba(232, 121, 160, 0.2);
  --button-gradient: linear-gradient(135deg, #e879a0, #c040a0);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-sans, system-ui, sans-serif);
}
```

- [ ] **Step 2: Create LoginPage component**

Create `components/LoginPage.tsx`:

```tsx
"use client";

import Image from "next/image";
import { signIn } from "next-auth/react";

export function LoginPage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center gap-5 px-4"
      style={{
        background: "linear-gradient(135deg, #1a0f2e, #2d1848 60%, #12091e)",
      }}
    >
      <div className="relative">
        <div
          className="w-24 h-24 rounded-full overflow-hidden border-2 shadow-lg"
          style={{
            borderColor: "var(--accent)",
            boxShadow: "0 0 20px rgba(232,121,160,0.3)",
          }}
        >
          <Image
            src="/images/emma-icon.png"
            alt="エマ"
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
        <span className="absolute -bottom-1 -right-1 text-lg">🌸</span>
      </div>

      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          エマとおはなし
        </h1>
        <p className="text-sm" style={{ color: "var(--subtext)" }}>
          ちょっとドジだけど明るい魔法少女のエマと
          <br />
          自由に会話できるよ ✨
        </p>
      </div>

      <button
        onClick={() => signIn("google", { callbackUrl: "/chat" })}
        className="flex items-center gap-3 bg-white text-gray-800 font-semibold
          px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-shadow cursor-pointer"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Googleでログイン
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Update root page**

Replace `app/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { LoginPage } from "@/components/LoginPage";

export default async function Home() {
  const session = await auth();
  if (session) redirect("/chat");
  return <LoginPage />;
}
```

- [ ] **Step 4: Update root layout with SessionProvider**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "エマとおはなし",
  description: "魔法少女エマとお話しできるチャットアプリ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
```

Note: `SessionProvider` wraps client components only — add it in the chat page layout or ChatPage component.

- [ ] **Step 5: Add emma-icon.png placeholder**

Place the provided free icon image at `public/images/emma-icon.png`.

If the file isn't available yet, create a placeholder:

```bash
mkdir -p public/images
# Copy the icon file to public/images/emma-icon.png
```

- [ ] **Step 6: Commit**

```bash
git add components/LoginPage.tsx app/page.tsx app/layout.tsx app/globals.css public/
git commit -m "feat: add login page with Google OAuth button"
```

---

## Task 7: Toast Component

**Files:**

- Create: `components/Toast.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/Toast.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Toast } from "../Toast";

describe("Toast", () => {
  it("renders the message when visible", () => {
    render(<Toast message="エラーが発生しました" visible={true} />);
    expect(screen.getByText("エラーが発生しました")).toBeInTheDocument();
  });

  it("is hidden when visible is false", () => {
    render(<Toast message="エラー" visible={false} />);
    const el = screen.getByText("エラー");
    expect(el.parentElement).toHaveClass("opacity-0");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test components/__tests__/Toast.test.tsx
```

Expected: FAIL — `Cannot find module '../Toast'`

- [ ] **Step 3: Create Toast component**

Create `components/Toast.tsx`:

```tsx
"use client";

interface ToastProps {
  message: string;
  visible: boolean;
}

export function Toast({ message, visible }: ToastProps) {
  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50
        px-4 py-2 rounded-lg text-sm font-medium
        transition-opacity duration-300 pointer-events-none
        ${visible ? "opacity-100" : "opacity-0"}`}
      style={{
        background: "var(--user-bubble)",
        color: "var(--text)",
        border: "1px solid var(--accent)",
      }}
    >
      {message}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test components/__tests__/Toast.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/Toast.tsx components/__tests__/
git commit -m "feat: add Toast component for error notifications"
```

---

## Task 8: MessageInput Component

**Files:**

- Create: `components/MessageInput.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/MessageInput.test.tsx`:

```tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MessageInput } from "../MessageInput";

describe("MessageInput", () => {
  it("calls onSend with input value on submit", () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} disabled={false} />);

    const input = screen.getByPlaceholderText("メッセージを入力...");
    fireEvent.change(input, { target: { value: "こんにちは" } });
    fireEvent.submit(input.closest("form")!);

    expect(onSend).toHaveBeenCalledWith("こんにちは");
  });

  it("does not call onSend when input is empty", () => {
    const onSend = vi.fn();
    render(<MessageInput onSend={onSend} disabled={false} />);
    fireEvent.submit(screen.getByRole("form"));
    expect(onSend).not.toHaveBeenCalled();
  });

  it("disables input and button when disabled=true", () => {
    render(<MessageInput onSend={vi.fn()} disabled={true} />);
    expect(screen.getByPlaceholderText("メッセージを入力...")).toBeDisabled();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test components/__tests__/MessageInput.test.tsx
```

Expected: FAIL — `Cannot find module '../MessageInput'`

- [ ] **Step 3: Create MessageInput component**

Create `components/MessageInput.tsx`:

```tsx
"use client";

import { useState, type FormEvent } from "react";

interface MessageInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
  const [value, setValue] = useState("");

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    onSend(value.trim());
    setValue("");
  }

  return (
    <form
      role="form"
      onSubmit={handleSubmit}
      className="flex gap-2 p-3 border-t"
      style={{ borderColor: "var(--input-border)", background: "var(--bg)" }}
    >
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="メッセージを入力..."
        disabled={disabled}
        className="flex-1 rounded-full px-4 py-2 text-sm outline-none disabled:opacity-50"
        style={{
          background: "var(--input-bg)",
          border: "1px solid var(--input-border)",
          color: "var(--text)",
        }}
      />
      <button
        type="submit"
        disabled={disabled || !value.trim()}
        className="w-9 h-9 rounded-full flex items-center justify-center
          text-white transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        style={{ background: "var(--button-gradient)" }}
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M22 2L11 13M22 2L15 22 11 13 2 9l20-7z" />
        </svg>
      </button>
    </form>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test components/__tests__/MessageInput.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/MessageInput.tsx components/__tests__/MessageInput.test.tsx
git commit -m "feat: add MessageInput component with submit handling"
```

---

## Task 9: MessageList Component

**Files:**

- Create: `components/MessageList.tsx`

- [ ] **Step 1: Write the failing test**

Create `components/__tests__/MessageList.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { MessageList } from "../MessageList";

const messages = [
  { role: "assistant" as const, content: "こんにちは！" },
  { role: "user" as const, content: "よろしく！" },
];

describe("MessageList", () => {
  it("renders all messages", () => {
    render(
      <MessageList messages={messages} streaming={false} streamingContent="" />,
    );
    expect(screen.getByText("こんにちは！")).toBeInTheDocument();
    expect(screen.getByText("よろしく！")).toBeInTheDocument();
  });

  it("shows streaming content when streaming=true", () => {
    render(
      <MessageList
        messages={[]}
        streaming={true}
        streamingContent="入力中..."
      />,
    );
    expect(screen.getByText("入力中...")).toBeInTheDocument();
  });

  it("shows typing indicator when streaming and streamingContent is empty", () => {
    render(<MessageList messages={[]} streaming={true} streamingContent="" />);
    expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test components/__tests__/MessageList.test.tsx
```

Expected: FAIL — `Cannot find module '../MessageList'`

- [ ] **Step 3: Create MessageList component**

Create `components/MessageList.tsx`:

```tsx
"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface MessageListProps {
  messages: Message[];
  streaming: boolean;
  streamingContent: string;
}

export function MessageList({
  messages,
  streaming,
  streamingContent,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  return (
    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex gap-2 items-start ${msg.role === "user" ? "justify-end" : ""}`}
        >
          {msg.role === "assistant" && (
            <div
              className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
              style={{ borderColor: "var(--accent)" }}
            >
              <Image
                src="/images/emma-icon.png"
                alt="エマ"
                width={24}
                height={24}
                className="object-cover"
              />
            </div>
          )}
          <div
            className="max-w-[75%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
            style={
              msg.role === "assistant"
                ? {
                    background: "var(--emma-bubble)",
                    border: "1px solid var(--emma-border)",
                    color: "var(--text)",
                    borderRadius: "0 12px 12px 12px",
                  }
                : {
                    background: "var(--user-bubble)",
                    color: "var(--text)",
                    borderRadius: "12px 0 12px 12px",
                  }
            }
          >
            {msg.content}
          </div>
        </div>
      ))}

      {streaming && (
        <div className="flex gap-2 items-start">
          <div
            className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 border"
            style={{ borderColor: "var(--accent)" }}
          >
            <Image
              src="/images/emma-icon.png"
              alt="エマ"
              width={24}
              height={24}
              className="object-cover"
            />
          </div>
          <div
            className="max-w-[75%] px-3 py-2 text-sm leading-relaxed"
            style={{
              background: "var(--emma-bubble)",
              border: "1px solid var(--emma-border)",
              color: "var(--text)",
              borderRadius: "0 12px 12px 12px",
            }}
          >
            {streamingContent || (
              <span data-testid="typing-indicator" className="flex gap-1">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0ms" }}
                >
                  ●
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "150ms" }}
                >
                  ●
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "300ms" }}
                >
                  ●
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test components/__tests__/MessageList.test.tsx
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add components/MessageList.tsx components/__tests__/MessageList.test.tsx
git commit -m "feat: add MessageList with streaming indicator"
```

---

## Task 10: ChatPage Component

**Files:**

- Create: `components/ChatPage.tsx`
- Create: `app/chat/page.tsx`

- [ ] **Step 1: Create ChatPage component**

Create `components/ChatPage.tsx`:

```tsx
"use client";

import { useState, useCallback } from "react";
import { signOut } from "next-auth/react";
import Image from "next/image";
import { MessageList } from "./MessageList";
import { MessageInput } from "./MessageInput";
import { Toast } from "./Toast";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatPageProps {
  initialMessages: Message[];
}

export function ChatPage({ initialMessages }: ChatPageProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  function showToast(message: string) {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }

  const handleSend = useCallback(async (message: string) => {
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setStreaming(true);
    setStreamingContent("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      if (!res.ok || !res.body) throw new Error("API error");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        full += chunk;
        setStreamingContent(full);
      }

      setMessages((prev) => [...prev, { role: "assistant", content: full }]);
    } catch {
      showToast("ちょっと魔法が乱れちゃったみたい…もう一度試してね🌸");
    } finally {
      setStreaming(false);
      setStreamingContent("");
    }
  }, []);

  async function handleReset() {
    try {
      const res = await fetch("/api/chat", { method: "DELETE" });
      if (!res.ok) throw new Error();
      setMessages([]);
    } catch {
      showToast("リセットに失敗したよ…もう一度試してね🌸");
    }
  }

  return (
    <div className="flex flex-col h-screen" style={{ background: "var(--bg)" }}>
      {/* Hero area */}
      <div
        className="relative flex flex-col items-center gap-2 py-4 px-4"
        style={{
          background: "linear-gradient(180deg, var(--hero) 0%, var(--bg) 100%)",
        }}
      >
        <div className="absolute top-3 right-3 flex gap-2">
          <button
            onClick={handleReset}
            className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--emma-border)",
              color: "var(--subtext)",
            }}
          >
            🌸 リセット
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid var(--emma-border)",
              color: "var(--subtext)",
            }}
          >
            ログアウト
          </button>
        </div>

        <div
          className="w-16 h-16 rounded-full overflow-hidden border-2 mt-2 shadow-lg"
          style={{
            borderColor: "var(--accent)",
            boxShadow: "0 0 16px rgba(232,121,160,0.3)",
          }}
        >
          <Image
            src="/images/emma-icon.png"
            alt="エマ"
            width={64}
            height={64}
            className="w-full h-full object-cover"
          />
        </div>
        <p className="font-bold text-sm" style={{ color: "var(--text)" }}>
          エマ
        </p>
        <p className="text-xs" style={{ color: "var(--subtext)" }}>
          明るくてちょっとドジな魔法少女
        </p>
      </div>

      {/* Message list */}
      <MessageList
        messages={messages}
        streaming={streaming}
        streamingContent={streamingContent}
      />

      {/* Input */}
      <MessageInput onSend={handleSend} disabled={streaming} />

      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
```

- [ ] **Step 2: Create chat page (server component)**

Create `app/chat/page.tsx`:

```tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { ChatPage } from "@/components/ChatPage";

export default async function Chat() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const messages = await db.message.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: { role: true, content: true },
  });

  return (
    <ChatPage
      initialMessages={messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }))}
    />
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add components/ChatPage.tsx app/chat/
git commit -m "feat: add ChatPage with hero layout, streaming, reset, and logout"
```

---

## Task 11: Run All Tests + Local Smoke Test

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: All tests PASS. Fix any failures before continuing.

- [ ] **Step 2: Start development server**

```bash
npm run dev
```

- [ ] **Step 3: Smoke test in browser**

1. Open `http://localhost:3000`
2. Verify login page shows with エマ icon and Google button
3. Log in with Google — should redirect to `/chat`
4. Send a message — verify streaming response from Emma
5. Send another message — verify conversation history appears
6. Click リセット — verify messages clear
7. Click ログアウト — verify redirect to `/`
8. Revisit `http://localhost:3000/chat` without login — verify redirect to `/`

- [ ] **Step 4: Test on mobile viewport**

In browser DevTools, set viewport to 375×812 (iPhone). Verify:

- Hero area is compact but readable
- Chat fills full height
- Input is accessible above keyboard (test by tapping input)

- [ ] **Step 5: Commit**

```bash
git add .
git commit -m "chore: verify all tests pass and smoke test complete"
```

---

## Task 12: Dockerfile + Cloud Run

**Files:**

- Create: `Dockerfile`
- Create: `.dockerignore`

- [ ] **Step 1: Create .dockerignore**

Create `.dockerignore`:

```
node_modules
.next
.env*
.git
.superpowers
coverage
docs
```

- [ ] **Step 2: Create Dockerfile**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=8080

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 8080

CMD ["node", "server.js"]
```

- [ ] **Step 3: Enable standalone output in Next.js config**

In `next.config.ts`, set:

```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
};

export default nextConfig;
```

- [ ] **Step 4: Build and test Docker image locally**

```bash
docker build -t emma-chatbot .
docker run -p 8080:8080 \
  -e AUTH_SECRET="..." \
  -e AUTH_GOOGLE_ID="..." \
  -e AUTH_GOOGLE_SECRET="..." \
  -e OPENAI_API_KEY="..." \
  -e DATABASE_URL="..." \
  emma-chatbot
```

Open `http://localhost:8080` and verify the app works.

- [ ] **Step 5: Deploy to Cloud Run**

```bash
# Set your project and region
PROJECT_ID=your-gcp-project-id
REGION=asia-northeast1
SERVICE_NAME=emma-chatbot

# Build and push to Artifact Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME

# Deploy to Cloud Run
gcloud run deploy $SERVICE_NAME \
  --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars AUTH_SECRET="...",AUTH_GOOGLE_ID="...",AUTH_GOOGLE_SECRET="...",OPENAI_API_KEY="...",DATABASE_URL="..."
```

Update the Google OAuth **Authorized redirect URI** in Google Cloud Console to include:
`https://<cloud-run-url>/auth/callback/google`

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore next.config.ts
git commit -m "feat: add Dockerfile and Cloud Run deployment config"
```

---

## Self-Review Checklist

- [x] **Auth**: Google OAuth, JWT sessions, User upsert on first login — Task 3
- [x] **Chat API POST**: Session check, history fetch, Mastra stream, save messages — Task 5
- [x] **Chat API DELETE**: Session check, deleteMany — Task 5
- [x] **Login page**: Emma icon, Google button, redirect if already logged in — Task 6
- [x] **Chat page**: Hero layout, message list, input, streaming, reset, logout — Tasks 9–10
- [x] **Persistence**: Messages fetched from DB on page load, saved after each exchange — Tasks 5, 10
- [x] **Reset**: Clears DB + clears UI state — Tasks 5, 10
- [x] **Error handling**: Toast on API error and reset failure — Task 10
- [x] **Responsive**: Mobile viewport check in Task 11
- [x] **Color palette**: CSS variables set in Task 6, used throughout
- [x] **Emma icon**: `public/images/emma-icon.png` referenced in Tasks 6, 9, 10
- [x] **Streaming**: Chunk-by-chunk display in ChatPage, `...` indicator in MessageList — Tasks 9, 10
- [x] **Middleware**: Route guard for `/chat` — Task 3
- [x] **Dockerfile + Cloud Run**: Task 12
