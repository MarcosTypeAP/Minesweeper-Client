# Minesweeper-Client

This classic puzzle game challenges you to clear a minefield without detonating any mines, all within a nice, clean UI.

<table>
    <tr>
        <td>
            <img src="https://github.com/MarcosTypeAP/Minesweeper-Client/blob/main/images/menu.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/Minesweeper-Client/blob/main/images/times.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/Minesweeper-Client/blob/main/images/won_game.png" />
        </td>
        <td>
            <img src="https://github.com/MarcosTypeAP/Minesweeper-Client/blob/main/images/lost_game.png" />
        </td>
    </tr>
</table>

> ⚠️ This is the client-side repo that needs to be complemented by its server-side for all functionality to be available.

> ⚠️ This game was (a little little bit) inspired by this mobile game: [Minesweeper - The Clean One](https://play.google.com/store/apps/details?id=ee.dustland.android.minesweeper)

## Live Demo

Deploy URL: https://mine-exploiter.vercel.app

## Features

- Classic Minesweeper gameplay.
- Save time records, settings, and unfinished games locally without requiring an account.
- User accounts for syncing data across devices and accessing saved progress.
- Responsive design, playable on both desktop and mobile devices.
- Multiple difficulty levels to choose from, from Easy to Extreme.
- User-friendly interface with intuitive and full customizable controls.
- Ability to change between multiple color themes for personalized gaming experience.

## Accounts

If you prefer not to create an account but would like to test the syncing data feature, simply navigate to the Sign Up page and refrain from interacting with it. After a moment, a popup will appear offering you a Test Account. Upon acceptance, you will be logged in, and the test account credentials will be displayed on the Settings page.

I haven't implemented a password recovery feature, so I hope you use a password manager to save it. If you aren't already using one, I strongly recommend doing so.

## Installation

### Download repo

You can download it as zip [here](https://github.com/MarcosTypeAP/Minesweeper-Client/archive/refs/heads/main.zip) or clone it:

```bash
git clone git@github.com:MarcosTypeAP/Minesweeper-Client.git
cd Minesweeper-Client
```

### Configuring

You need to set the environment variables found in `./env_vars`.  
You can `export` or save them in a `.env` file.

| Name | Info | Example |
|---|---|---|
| VITE_API_URL | Must be a URL that does not end with trailing slash. | `https://example.site/api` |

You can change the `host` and `port` modifying `./vite.config.ts`:

```typescript
export default defineConfig({
    server: {
        host: '0.0.0.0',
        port: 3000
    }
})
```

### Build

```bash
npm install
npm run build
# Build created in ./dist
npm run preview
```

### Development

```bash
npm install
npm run dev
```
