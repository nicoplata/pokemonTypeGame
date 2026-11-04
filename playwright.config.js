import { defineConfig, devices } from '@playwright/test'

const PUERTO = 4173

export default defineConfig({
    testDir: 'tests/e2e',
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['github'], ['list']] : 'list',
    use: {
        baseURL: `http://localhost:${PUERTO}`,
        reducedMotion: 'reduce',
        trace: 'retain-on-failure'
    },
    projects: [
        { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } } },
        { name: 'movil', use: { ...devices['Pixel 7'] } }
    ],
    webServer: {
        command: `node scripts/servidor.mjs`,
        env: { PORT: String(PUERTO) },
        url: `http://localhost:${PUERTO}`,
        reuseExistingServer: !process.env.CI
    }
})
