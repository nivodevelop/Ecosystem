import type { Role } from "@prisma/client";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Админ",
  MANAGER: "Менеджер",
  MEMBER: "Сотрудник",
};

// Кто что может делать. Сотрудник видит доску и двигает карточки по этапам.
export const can = {
  moveCard: (r: Role) => r === "ADMIN" || r === "MANAGER" || r === "MEMBER",
  editApp: (r: Role) => r === "ADMIN" || r === "MANAGER",
  deleteApp: (r: Role) => r === "ADMIN",
  manageUsers: (r: Role) => r === "ADMIN",
  viewPositions: (r: Role) => r === "ADMIN",
};
