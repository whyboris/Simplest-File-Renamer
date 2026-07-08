import { bootstrapApplication } from "@angular/platform-browser";
import { appConfig } from "./app/app.config";

import { HomeComponent } from "./app/home.component";

bootstrapApplication(HomeComponent, appConfig).catch((err) =>
  console.error(err),
);
