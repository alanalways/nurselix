import type { DefaultSession } from "next-auth";
import type { Role, Plan } from "@/types";

declare module "next-auth" {
  interface User {
    role?: Role;
    plan?: Plan;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      plan: Plan;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    plan?: Plan;
  }
}
