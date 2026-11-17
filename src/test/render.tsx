import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { AppProviders } from "@/context/AppProviders";

/** Renders UI inside the app-wide providers (settings + history). */
export function renderWithApp(ui: ReactElement) {
  return render(<AppProviders>{ui}</AppProviders>);
}
