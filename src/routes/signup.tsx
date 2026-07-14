import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "./login";
import { pageHead } from "@/lib/seo/pages";

export const Route = createFileRoute("/signup")({
  head: () => pageHead("signup"),
  component: () => (
    <AuthScreen title="Create your account" subtitle="Start with 3 free outfit suggestions." />
  ),
});
