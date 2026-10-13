// Production code has no test session, guest route or authentication bypass.
import { createRoot } from "react-dom/client";
import { Planner } from "../src/components/Planner";
createRoot(document.getElementById("root")!).render(<Planner userId="fixture-member" email="fixture-member@example.test"/>);
