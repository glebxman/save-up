/**
 * UI primitives barrel.
 *
 * Each primitive lives in its own file for navigability and tree-shaking.
 * Import from `@/components/ui` for the full set, or from the specific file
 * (e.g. `@/components/ui/Button`) when you only need one.
 */
import type { ReactNode } from "react";

export { cn } from "./cn";
export { Button } from "./Button";
export {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "./Card";
export { Chip } from "./Chip";
export { Input, TextArea, Select } from "./Field";
export { Spinner } from "./Spinner";
export { ProgressBar } from "./ProgressBar";
export {
  Modal,
  ModalRoot,
  ModalBackdrop,
  ModalContainer,
  ModalDialog,
  ModalCloseTrigger,
  ModalHeader,
  ModalBody,
  ModalHeading,
  ModalFooter,
} from "./Modal";
export { Avatar } from "./Avatar";
export { Skeleton } from "./Skeleton";

export type { ReactNode };
