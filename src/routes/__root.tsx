import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-[11px] tracking-[0.24em] uppercase text-muted-foreground">Draxler</div>
        <h1 className="mt-4 text-foreground">404</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Страница не найдена. Возможно, она была перемещена или удалена.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[2px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors"
          >
            На главную
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <div className="text-[11px] tracking-[0.24em] uppercase text-muted-foreground">Ошибка</div>
        <h1 className="mt-4 text-foreground">Что-то пошло не так</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Попробуйте обновить страницу или вернуться на главную.
        </p>
        <div className="mt-8 flex justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center h-11 px-6 rounded-[2px] bg-primary text-primary-foreground text-[14px] font-medium hover:bg-primary/90 transition-colors"
          >
            Повторить
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center h-11 px-6 rounded-[2px] bg-muted text-foreground text-[14px] font-medium hover:bg-muted/70 transition-colors"
          >
            На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Draxler — Admin" },
      {
        name: "description",
        content: "Админ-панель Draxler — публикация и управление каталогом премиальных дисков.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://rsms.me" },
      { rel: "stylesheet", href: "https://rsms.me/inter/inter.css" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster
        position="bottom-center"
        toastOptions={{
          unstyled: false,
          classNames: {
            toast:
              "!bg-background !text-foreground !border !border-border !rounded-[2px] !shadow-elevated !text-[14px] !py-3 !px-4",
          },
        }}
      />
    </QueryClientProvider>
  );
}
