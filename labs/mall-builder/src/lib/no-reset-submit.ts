import { startTransition, type FormEvent } from "react";

// React 19는 <form action={formAction}>이 끝나면 폼을 초기화(form.reset)한다.
// 화면 상태(useState)로 관리하는 칸(선택·라디오·글자 칸)은 화면 값만 처음으로 돌아가고 상태는 그대로라 서로 어긋난다
// (예: 오류 뒤 상품 선택이 비어 보이는데 실제로는 골라져 있음). 그런 폼은 이 함수로 제출해 초기화를 막는다.
// 사용: const [state, formAction] = useActionState(...); <form onSubmit={noResetSubmit(formAction)}>
export function noResetSubmit(formAction: (data: FormData) => void) {
  return (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    startTransition(() => formAction(data));
  };
}
