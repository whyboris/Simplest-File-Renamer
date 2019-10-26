import 'reflect-metadata';
import '../polyfills';

import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';

import { HelperService } from './home/helper.service';

import { ComparisonComponent } from './home/comparison/comparison.component';
import { HomeComponent } from './home/home.component';
import { IconComponent } from './home/icons/icon.component';
import { SvgDefinitionsComponent } from './home/icons/svg-definitions.component';

@NgModule({
  declarations: [
    ComparisonComponent,
    HomeComponent,
    IconComponent,
    SvgDefinitionsComponent
  ],
  imports: [
    BrowserModule,
    FormsModule
  ],
  providers: [
    HelperService
  ],
  bootstrap: [
    HomeComponent
  ]
})
export class AppModule {}
