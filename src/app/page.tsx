import { redirect } from "next/navigation";

/**
 * InternHub được phục vụ dưới dạng HTML + ES Modules trong public/Interhub.
 * Không khởi tạo PostgreSQL/Drizzle tại trang chủ vì ứng dụng hiện tại
 * sử dụng Firebase và không cần DATABASE_URL để render giao diện.
 */
export default function HomePage(): never {
  redirect("/Interhub/index.html");
}
