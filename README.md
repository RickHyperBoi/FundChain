# 🚀 FundChain - Web3 Crowdfunding DApp

FundChain is a decentralized crowdfunding platform built on the Ethereum Sepolia Testnet. It empowers creators to launch funding campaigns transparently and enables backers to pledge ETH with smart contract-backed guarantees.

---

## ✨ Features

- 🦊 **MetaMask Wallet Integration**:
  - Connect/disconnect MetaMask seamlessly.
  - Automatic Sepolia network check (Chain ID `11155111` / `0xaa36a7`).
  - Truncated wallet address display and real-time status indicators.

- 📝 **Campaign Creation**:
  - Launch campaigns with custom titles, descriptions, target goals (in ETH), and duration (in days).
  - Smart contract dynamically calculates deadlines and campaign IDs.

- 💰 **Pledging System**:
  - **Card Pledging**: Back active campaigns directly from their card view.
  - **Quick Pledge**: Pledge to any campaign by entering its Campaign ID and ETH amount in the quick-action form.

- 🛡️ **Trustless Fund Management**:
  - **Creator Claiming**: Creators can claim raised funds when campaign goal is reached.
  - **Backer Refunds**: Automatic refunds if a campaign expires without meeting its target goal.

- 📊 **Real-Time Analytics & Dashboard**:
  - Live campaign counters and total ETH pledged metrics.
  - Dynamic progress bars showing funding percentage.
  - Status badges (`Active`, `Successful`, `Expired`) and deadline formatting.

- 🔔 **Interactive UI/UX**:
  - Toast notification system for feedback on transaction states (pending, success, error, info).
  - Dark mode aesthetic powered by Tailwind CSS.

---

## 🛠️ Tech Stack & Technologies

### Frontend
- **React 19** – UI component framework
- **Vite 8** – Lightning-fast build tool and dev server
- **Tailwind CSS** – Styling and dark mode design
- **JavaScript (ES Modules)** – Application codebase

### Blockchain & Web3
- **Ethers.js v6** – Ethereum wallet connection and smart contract interactions
- **Solidity** – Smart contract language (EVM compatible)
- **Ethereum Sepolia Testnet** – Target deployment network
- **MetaMask** – In-browser Ethereum provider

### Tooling & Quality Assurance
- **Oxlint** – Fast JavaScript linter
- **Node.js & npm** – Package management and build runtime

---

## 📜 Smart Contract Information

- **Contract Address**: `0x0B5F275c69Ef93Fa6795EC9059262F8111F6CEF1`
- **Network**: Sepolia Testnet (Chain ID: `11155111`)

### Key Contract Functions
| Function | Access | Description |
| :--- | :--- | :--- |
| `createCampaign` | Anyone | Create a new crowdfunding campaign |
| `pledge` | Anyone | Contribute ETH to an active campaign |
| `claim` | Creator | Withdraw raised funds if target is met |
| `refund` | Backers | Reclaim pledged ETH if campaign expires unmet |
| `campaigns` | View | Fetch campaign details by ID |
| `campaignCount` | View | Get total number of created campaigns |

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [MetaMask Wallet](https://metamask.io/) extension installed with Sepolia ETH

### Installation & Local Setup

1. **Navigate to project directory**:
   ```bash
   cd my-crowdfund-dapp
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start development server**:
   ```bash
   npm run dev
   ```

4. **Build for production**:
   ```bash
   npm run build
   ```

---

## 📁 Project Structure

```
my-crowdfund-dapp/
├── public/              # Static assets
├── src/
│   ├── assets/          # Icons and imagery
│   ├── App.css          # Global app styles
│   ├── App.jsx          # Primary React application logic & UI
│   ├── contractABI.json # Smart contract ABI
│   ├── index.css        # Base Tailwind CSS directives
│   └── main.jsx         # React application entry point
├── index.html           # HTML entry template
├── package.json         # Dependencies and scripts
└── vite.config.js       # Vite configuration
```

