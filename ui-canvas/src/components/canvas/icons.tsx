import type { LucideIcon } from "lucide-react";
import {
  Bell, CircleCheck, CircleX, House, Info, Mail, Pause, Play, Search, Settings, SkipBack, SkipForward, TriangleAlert, User, X,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  MailIcon: Mail,
  BellIcon: Bell,
  HomeIcon: House,
  UserIcon: User,
  CogIcon: Settings,
  SearchIcon: Search,
  CheckCircleIcon: CircleCheck,
  XCircleIcon: CircleX,
  InformationCircleIcon: Info,
  ExclamationTriangleIcon: TriangleAlert,
  PlayIcon: Play,
  PauseIcon: Pause,
  ForwardIcon: SkipForward,
  BackwardIcon: SkipBack,
  XMarkIcon: X,
};

export const ICON_LABEL: Record<string, string> = {
  MailIcon: "메일", BellIcon: "알림", HomeIcon: "홈", UserIcon: "사용자", CogIcon: "설정", SearchIcon: "검색",
  CheckCircleIcon: "성공", XCircleIcon: "오류", InformationCircleIcon: "정보", ExclamationTriangleIcon: "경고",
  PlayIcon: "재생", PauseIcon: "일시정지", ForwardIcon: "다음", BackwardIcon: "이전", XMarkIcon: "닫기",
};
