import { redirect } from "next/navigation";
import { DEFAULT_LOCALE } from "@darb-rest/config";

export default function RootPage() {
  redirect(`/${DEFAULT_LOCALE}`);
}
