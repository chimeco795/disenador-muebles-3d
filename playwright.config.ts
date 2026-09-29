import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',timeout:45000,workers:1,reporter:'line',webServer:{command:'npm.cmd run dev -- --port 5173',url:'http://127.0.0.1:5173',reuseExistingServer:true}});
