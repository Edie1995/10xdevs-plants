import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "../ui/card";

interface AuthFormShellProps {
  title: string;
  description?: string;
  footer?: ReactNode;
  children: ReactNode;
}

export default function AuthFormShell({ title, description, footer, children }: AuthFormShellProps) {
  return (
    <Card className="border-neutral-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-xl">{title}</CardTitle>
        {description ? <CardDescription className="text-neutral-600">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
      {footer ? (
        <CardFooter className="flex flex-col items-start gap-2 border-t border-neutral-100 text-sm text-neutral-600">
          {footer}
        </CardFooter>
      ) : null}
    </Card>
  );
}
