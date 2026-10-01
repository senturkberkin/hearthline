export { cn } from "cn"

export function sitePath(path: string) {
  return import.meta.env.BASE_URL + (path === "/" ? "" : path.replace(/^\//, ""))
}
