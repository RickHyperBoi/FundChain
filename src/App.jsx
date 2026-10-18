import { useState, useEffect } from "react";
import { ethers } from "ethers";
import contractABI from "./contractABI.json";
import "./App.css";

function App() {
  const CONTRACT_ADDRESS = "0x0B5F275c69Ef93Fa6795EC9059262F8111F6CEF1";

  // Global State
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  // App & Campaign State
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null); // { type: 'success' | 'error' | 'info', text: string }

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [durationInDays, setDurationInDays] = useState("");

  // Pledge States
  const [pledgeAmounts, setPledgeAmounts] = useState({});
  const [quickCampaignId, setQuickCampaignId] = useState("");
  const [quickPledgeAmount, setQuickPledgeAmount] = useState("");

  // Helper function to truncate wallet address
  const truncateAddress = (addr) => {
    if (!addr) return "";
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Toast Helper
  const showToast = (type, text) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast(null);
    }, 6000);
  };

  // 1. Connect Wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        showToast("error", "MetaMask is not installed!");
        return;
      }

      const browserProvider = new ethers.BrowserProvider(window.ethereum);
      await browserProvider.send("eth_requestAccounts", []);

      const network = await browserProvider.getNetwork();
      if (network.chainId !== 11155111n) {
        alert("Please switch your MetaMask network to Sepolia!");
      }

      const userSigner = await browserProvider.getSigner();
      const userAddress = await userSigner.getAddress();
      const crowdContract = new ethers.Contract(
        CONTRACT_ADDRESS,
        contractABI,
        userSigner
      );

      setProvider(browserProvider);
      setSigner(userSigner);
      setAccount(userAddress);
      setContract(crowdContract);

      showToast("success", `Connected: ${truncateAddress(userAddress)}`);
      await fetchCampaigns(crowdContract);
    } catch (err) {
      console.error("Error connecting wallet:", err);
      showToast("error", err.reason || err.message || "Failed to connect wallet.");
    }
  };

  // Disconnect Wallet Function
  const disconnectWallet = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({
          method: "wallet_revokePermissions",
          params: [
            { eth_accounts: {} }
          ]
        });
      } catch (error) {
        console.error("Failed to revoke permissions:", error);
      }
    }

    setAccount(null);
    setProvider(null);
    setSigner(null);
    setContract(null);
    showToast("info", "Wallet disconnected.");
  };

  // 3. View Campaigns Function
  const fetchCampaigns = async (contractInstance = contract) => {
    if (!contractInstance) return;
    try {
      setLoading(true);
      const count = await contractInstance.campaignCount();
      const fetched = [];

      for (let i = 1; i <= Number(count); i++) {
        const c = await contractInstance.campaigns(i);
        fetched.push({
          id: i,
          creator: c.creator,
          title: c.title,
          description: c.description,
          goal: c.goal,
          deadline: Number(c.deadline),
          pledgedAmount: c.pledgedAmount,
          claimed: c.claimed,
        });
      }

      setCampaigns(fetched);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Create Campaign Function
  const handleCreateCampaign = async (e) => {
    e.preventDefault();
    if (!contract) {
      showToast("error", "Please connect your wallet first.");
      return;
    }
    if (!title || !description || !goal || !durationInDays) {
      showToast("error", "Please fill in all form fields.");
      return;
    }

    try {
      showToast("info", "Creating campaign... Please confirm in MetaMask.");
      const goalInWei = ethers.parseEther(goal.toString());
      const tx = await contract.createCampaign(
        title,
        description,
        goalInWei,
        BigInt(durationInDays)
      );
      showToast("info", "Transaction submitted. Awaiting confirmation...");
      await tx.wait();

      showToast("success", "Campaign created successfully!");
      setTitle("");
      setDescription("");
      setGoal("");
      setDurationInDays("");

      await fetchCampaigns(contract);
    } catch (err) {
      console.error("Error creating campaign:", err);
      showToast("error", err.reason || err.message || "Failed to create campaign.");
    }
  };

  // Handle Pledge Function
  const handlePledge = async (id, amount) => {
    if (!contract) {
      showToast("error", "Please connect your wallet first.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      showToast("error", "Please enter a valid pledge amount in ETH.");
      return;
    }

    try {
      showToast("info", `Pledging ${amount} ETH to Campaign #${id}...`);
      const tx = await contract.pledge(id, {
        value: ethers.parseEther(amount.toString()),
      });
      showToast("info", "Pledge submitted. Awaiting block confirmation...");
      await tx.wait();

      showToast("success", `Pledged ${amount} ETH to Campaign #${id}!`);
      setPledgeAmounts((prev) => ({ ...prev, [id]: "" }));
      if (quickCampaignId === id.toString()) setQuickPledgeAmount("");

      await fetchCampaigns(contract);
    } catch (err) {
      console.error("Error pledging to campaign:", err);
      showToast("error", err.reason || err.message || "Pledge failed.");
    }
  };

  // Quick Pledge Submit
  const handleQuickPledgeSubmit = (e) => {
    e.preventDefault();
    if (!quickCampaignId) {
      showToast("error", "Please enter a Campaign ID.");
      return;
    }
    handlePledge(quickCampaignId, quickPledgeAmount);
  };

  // Claim Creator Funds
  const handleClaim = async (id) => {
    if (!contract) {
      showToast("error", "Please connect your wallet first.");
      return;
    }
    try {
      showToast("info", `Claiming funds for Campaign #${id}...`);
      const tx = await contract.claim(id);
      await tx.wait();
      showToast("success", `Funds claimed for Campaign #${id}!`);
      await fetchCampaigns(contract);
    } catch (err) {
      console.error("Error claiming funds:", err);
      showToast("error", err.reason || err.message || "Claim failed.");
    }
  };

  // Claim Refund
  const handleRefund = async (id) => {
    if (!contract) {
      showToast("error", "Please connect your wallet first.");
      return;
    }
    try {
      showToast("info", `Requesting refund for Campaign #${id}...`);
      const tx = await contract.refund(id);
      await tx.wait();
      showToast("success", `Refund processed for Campaign #${id}!`);
      await fetchCampaigns(contract);
    } catch (err) {
      console.error("Error requesting refund:", err);
      showToast("error", err.reason || err.message || "Refund failed.");
    }
  };

  // Campaign Status Calculation
  const getCampaignStatus = (campaign) => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const isDeadlinePassed = currentTimestamp >= campaign.deadline;
    const isGoalReached = BigInt(campaign.pledgedAmount) >= BigInt(campaign.goal);

    if (isGoalReached) {
      return "Successful";
    } else if (isDeadlinePassed) {
      return "Expired";
    } else {
      return "Active";
    }
  };

  // Aggregated ETH Pledged
  const totalEthPledgedWei = campaigns.reduce(
    (acc, c) => acc + BigInt(c.pledgedAmount || 0),
    0n
  );
  const totalEthPledged = ethers.formatEther(totalEthPledgedWei);

  // Initial load on mount - strictly read-only for public campaigns
  // User remains disconnected until explicitly clicking "Connect Wallet"
  useEffect(() => {
    const initReadOnly = async () => {
      try {
        if (window.ethereum) {
          const readProvider = new ethers.BrowserProvider(window.ethereum);
          const readContract = new ethers.Contract(
            CONTRACT_ADDRESS,
            contractABI,
            readProvider
          );
          await fetchCampaigns(readContract);
        }
      } catch (err) {
        console.error("Error initializing read-only contract:", err);
      }
    };

    initReadOnly();
  }, []);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-500 selection:text-white pb-16">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3.5 rounded-xl border shadow-2xl backdrop-blur-lg flex items-center gap-3 transition-all animate-bounce ${
            toast.type === "error"
              ? "bg-rose-950/90 border-rose-800 text-rose-200"
              : toast.type === "success"
              ? "bg-emerald-950/90 border-emerald-800 text-emerald-200"
              : "bg-indigo-950/90 border-indigo-800 text-indigo-200"
          }`}
        >
          <span className="text-lg">
            {toast.type === "error" ? "⚠️" : toast.type === "success" ? "✅" : "ℹ️"}
          </span>
          <span className="text-sm font-medium">{toast.text}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-[#111827]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Left Brand Chip */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                  FundChain
                </span>
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 text-[10px] font-bold rounded-full">
                  DAPP PORTAL
                </span>
              </div>
              <p className="text-xs text-slate-400">Decentralized Crowdfunding Platform</p>
            </div>
          </div>

          {/* Right Wallet Status & Action Buttons */}
          <div className="flex items-center gap-3">
            {account ? (
              <>
                {/* Connection Indicator Pill */}
                <div className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Connected</span>
                </div>

                {/* Connected Account Display */}
                <div className="bg-slate-800 text-slate-200 border border-slate-700 font-mono text-xs font-semibold rounded-xl px-3.5 py-2">
                  {truncateAddress(account)}
                </div>

                {/* Disconnect Button */}
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-slate-300 hover:text-rose-300 border border-slate-700 hover:bg-red-900/50 rounded-xl px-3 py-2 transition-all cursor-pointer font-medium"
                >
                  Disconnect
                </button>
              </>
            ) : (
              <>
                {/* Disconnected Indicator Pill */}
                <div className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-2 bg-rose-500/10 text-rose-400 border-rose-500/20">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  <span>Disconnected</span>
                </div>

                {/* Connect Wallet Button */}
                <button
                  onClick={connectWallet}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl px-5 py-2.5 shadow-lg shadow-blue-500/20 transition-all duration-200 cursor-pointer text-sm"
                >
                  Connect Wallet
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6">
        {/* Smart Contract Address Badge */}
        <div className="mb-6 flex justify-start">
          <div className="bg-[#111827] border border-slate-800 text-slate-400 font-mono text-xs rounded-lg px-3.5 py-2 inline-flex items-center gap-2 shadow-sm">
            <span className="text-indigo-400 font-semibold">SMART CONTRACT:</span>
            <span>{truncateAddress(CONTRACT_ADDRESS)}</span>
          </div>
        </div>

        {/* 3-Card Metrics / Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-xl">
              🚀
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">TOTAL CAMPAIGNS</p>
              <p className="text-2xl font-bold text-white mt-0.5">{campaigns.length}</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl">
              💎
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">TOTAL ETH PLEDGED</p>
              <p className="text-2xl font-bold text-white mt-0.5">{totalEthPledged} ETH</p>
            </div>
          </div>

          <div className="bg-[#111827] border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center text-xl">
              👤
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">YOUR STATUS</p>
              <p className="text-sm font-bold text-white mt-0.5 font-mono">
                {account ? truncateAddress(account) : "Not Connected"}
              </p>
            </div>
          </div>
        </div>
        {/* Two-Column Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-10">
          {/* Left Column: 01 Create Campaign */}
          <div className="lg:col-span-7 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-bold">
                01
              </span>
              <h2 className="text-xl font-bold text-white">Create Campaign</h2>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Campaign Title
                </label>
                <input
                  id="title"
                  type="text"
                  placeholder="e.g. Next-Gen Web3 Infrastructure"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Description
                </label>
                <textarea
                  id="description"
                  rows="3"
                  placeholder="Describe your crowdfunding campaign mission and goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="goal" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Goal (ETH)
                  </label>
                  <input
                    id="goal"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 2.5"
                    value={goal}
                    onChange={(e) => setGoal(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Duration (Days)
                  </label>
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    placeholder="e.g. 30"
                    value={durationInDays}
                    onChange={(e) => setDurationInDays(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium rounded-xl py-3 shadow-lg shadow-indigo-500/20 transition-all duration-200 cursor-pointer text-sm"
              >
                Create Campaign
              </button>
            </form>
          </div>

          {/* Right Column: 02 Quick Pledge & Info */}
          <div className="lg:col-span-5 bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-bold">
                  02
                </span>
                <h2 className="text-xl font-bold text-white">Quick Pledge</h2>
              </div>

              <form onSubmit={handleQuickPledgeSubmit} className="space-y-4 mb-6">
                <div>
                  <label htmlFor="quickId" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Campaign ID
                  </label>
                  <input
                    id="quickId"
                    type="number"
                    min="1"
                    placeholder="e.g. 1"
                    value={quickCampaignId}
                    onChange={(e) => setQuickCampaignId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="quickAmount" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Amount (ETH)
                  </label>
                  <input
                    id="quickAmount"
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 0.5"
                    value={quickPledgeAmount}
                    onChange={(e) => setQuickPledgeAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-4 py-2.5 text-sm transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl py-2.5 px-4 shadow-lg shadow-emerald-500/20 transition-all duration-200 cursor-pointer text-sm"
                >
                  Quick Pledge
                </button>
              </form>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                🔒 Smart Contract Rules
              </h3>
              <ul className="text-xs text-slate-400 space-y-1.5">
                <li>• All pledges are secured on the Sepolia blockchain.</li>
                <li>• Creator can claim funds only when target goal is met.</li>
                <li>• Backers can claim 100% refund if campaign expires unmet.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Section: 03 All Campaigns & Explorer */}
        <section className="bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 rounded-md text-xs font-bold">
                03
              </span>
              <div>
                <h2 className="text-xl font-bold text-white">All Campaigns & Explorer</h2>
                <p className="text-xs text-slate-400">Live decentralized crowdfunding campaigns on Sepolia</p>
              </div>
            </div>

            <button
              onClick={() => fetchCampaigns(contract || provider)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-medium inline-flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
            >
              <svg className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-400 text-sm font-medium">Fetching campaigns from smart contract...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="py-16 text-center bg-slate-950/40 rounded-xl border border-slate-800/80">
              <span className="text-4xl block mb-3">🌱</span>
              <p className="text-white font-semibold text-base">No Campaigns Found</p>
              <p className="text-slate-400 text-xs mt-1">Be the first to create a campaign above!</p>
            </div>
          ) : (
            <div className="campaign-grid">
              {campaigns.map((campaign) => {
                const status = getCampaignStatus(campaign);
                const goalEth = Number(ethers.formatEther(campaign.goal));
                const pledgedEth = Number(ethers.formatEther(campaign.pledgedAmount));
                const percentage = goalEth > 0 ? Math.min(Math.round((pledgedEth / goalEth) * 100), 100) : 0;
                const isCreator = account && account.toLowerCase() === campaign.creator.toLowerCase();

                return (
                  <div
                    key={campaign.id}
                    className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: ID Badge + Status Pill */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="font-mono text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                          #{campaign.id}
                        </span>
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            status === "Active"
                              ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                              : status === "Successful"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          }`}
                        >
                          {status}
                        </span>
                      </div>

                      {/* Campaign Title & Description */}
                      <h3 className="text-lg font-bold text-white mb-1.5 line-clamp-1">
                        {campaign.title}
                      </h3>
                      <p className="text-slate-400 text-xs mb-4 line-clamp-2 leading-relaxed">
                        {campaign.description}
                      </p>

                      {/* Creator Address */}
                      <div className="text-[11px] text-slate-500 font-mono mb-4 flex items-center justify-between">
                        <span>Creator:</span>
                        <span className="text-slate-400 font-semibold">{truncateAddress(campaign.creator)}</span>
                      </div>

                      {/* Progress Bar & Goal Breakdown */}
                      <div className="mb-4">
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span className="text-slate-300 font-semibold">{pledgedEth} ETH raised</span>
                          <span className="text-indigo-400 font-bold">{percentage}%</span>
                        </div>
                        <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-[11px] text-slate-500 text-right mt-1">
                          Goal: {goalEth} ETH
                        </p>
                      </div>

                      {/* Deadline Tag */}
                      <div className="text-[11px] text-slate-400 bg-slate-950/60 rounded-lg px-3 py-2 border border-slate-800/80 mb-5 flex justify-between items-center">
                        <span className="text-slate-500">Deadline:</span>
                        <span className="font-mono text-slate-300">
                          {new Date(campaign.deadline * 1000).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Action Area */}
                    <div className="space-y-3 pt-2 border-t border-slate-800/80">
                      {/* Pledge Form on Card */}
                      {status === "Active" && (
                        <div className="flex gap-2">
                          <input
                            type="number"
                            step="any"
                            min="0"
                            placeholder="ETH"
                            value={pledgeAmounts[campaign.id] || ""}
                            onChange={(e) =>
                              setPledgeAmounts({
                                ...pledgeAmounts,
                                [campaign.id]: e.target.value,
                              })
                            }
                            className="flex-1 bg-slate-950 border border-slate-800 focus:border-indigo-500 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl px-3 py-2 text-xs transition-all"
                          />
                          <button
                            onClick={() => handlePledge(campaign.id, pledgeAmounts[campaign.id])}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl py-2 px-4 shadow-lg shadow-emerald-500/20 text-xs transition-all cursor-pointer"
                          >
                            Pledge
                          </button>
                        </div>
                      )}

                      {/* Claim Funds Button (Creator) */}
                      {status === "Successful" && !campaign.claimed && (
                        <button
                          onClick={() => handleClaim(campaign.id)}
                          className="w-full bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl py-2 px-4 text-xs font-semibold transition-all cursor-pointer"
                        >
                          💰 Claim Funds {isCreator ? "(Creator)" : ""}
                        </button>
                      )}

                      {/* Refund Button (Expired & Unsuccessful) */}
                      {status === "Expired" && (
                        <button
                          onClick={() => handleRefund(campaign.id)}
                          className="w-full bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl py-2 px-4 text-xs font-semibold transition-all cursor-pointer"
                        >
                          🔄 Claim Refund
                        </button>
                      )}

                      {/* Claimed Status */}
                      {campaign.claimed && (
                        <div className="w-full bg-slate-800/80 text-slate-400 border border-slate-700/50 rounded-xl py-2 text-center text-xs font-semibold">
                          ✅ Funds Claimed
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;

