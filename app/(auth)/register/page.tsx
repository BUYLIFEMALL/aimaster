import { Suspense } from "react";
import RegisterForm from "./RegisterForm";

export const metadata = { title: "회원가입" };

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
