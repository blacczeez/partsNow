import { appFont } from '@/lib/fonts/app-font';
import { cn } from '@/lib/utils/cn';

interface AppFontShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppFontShell({ children, className }: AppFontShellProps) {
  return (
    <div className={cn(appFont.className, appFont.variable, 'min-h-full', className)}>
      {children}
    </div>
  );
}
