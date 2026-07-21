import { AppBrandIcon } from "@/components/brand/app-brand-mark";

type AppLoadingScreenProps = {
  message?: string;
};

export function AppLoadingScreen({ message = "Loading..." }: AppLoadingScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="text-center">
        <AppBrandIcon className="mx-auto mb-4 h-14 w-14 rounded-2xl" />
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <p className="text-slate-600 dark:text-slate-400">{message}</p>
      </div>
    </div>
  );
}
