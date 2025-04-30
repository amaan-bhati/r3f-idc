'use client';
import React, { useRef, useState } from 'react';
import NextImage from 'next/image';

const loadingStates = [
  {
    text: "Checking the registration Status",
  },
  {
    text: "Checking your acceptance into the program",
  },
  {
    text: "Checking if you have star marked our repository",
  },
];

interface UserData {
    name: string;
    github: string;
    email: string;
    image: string;
    generated: boolean;
  }
  
  interface HeroProps {
    onDataUpdate: (newData: Partial<UserData>) => void;
    userData: UserData;
  }

export default function Hero({ onDataUpdate, userData }: HeroProps) {
  const { name, github, email, image, generated } = userData;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => onDataUpdate({ image: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const checkGitHubStar = async (username: string): Promise<boolean> => {
    if (!username) return false;
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(`https://api.github.com/user/starred/keploy/keploy`, {
        headers: {
          'X-GitHub-Api-Version': '2022-11-28',
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': username
        }
      });
      if (response.status === 401 || response.status === 403) {
        // If we hit authentication issues, we'll use an alternative approach
        // This is a public API that lists a user's starred repos (paginated)
        const page1Response = await fetch(`https://api.github.com/users/${username}/starred?per_page=100&page=1`);
        if (!page1Response.ok) {
          console.error("Error fetching user's starred repos:", page1Response.status);
          return false;
        }
        const starredRepos = await page1Response.json();
        // Check if keploy/keploy is in the list of starred repos
        return starredRepos.some((repo: any) =>
          repo.full_name.toLowerCase() === 'keploy/keploy'
        );
      }
      // If response is 204, the user has starred the repo
      return response.status === 204;
    } catch (error) {
      console.error("Error checking GitHub star:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!name || !github || !email || !image) {
      alert('Please fill all fields and upload a picture.');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      // Check if user has starred the repository
      const hasStarred = await checkGitHubStar(github);
      if (!hasStarred) {
        setError("You need to star the Keploy repository to generate an ID card. Please star it here: https://github.com/keploy/keploy");
        return;
      }
      // If we got here, the user has starred the repo
      onDataUpdate({ generated: true });
    } catch (error) {
      console.error("Error during generation:", error);
      setError("There was an error processing your request. Please try again later or contact devrel@keploy.io");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Load background image first
    const bgImg = new window.Image();
    bgImg.src = '/assets/images/card-background.png';
    
    bgImg.onload = () => {
      // Draw background image to fill canvas
      ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
      
      // Add decorative elements (optional, might not be needed with the background image)
      ctx.fillStyle = 'rgba(255, 136, 0, 0.05)';
      ctx.beginPath();
      ctx.arc(50, 50, 100, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(canvas.width - 50, canvas.height - 50, 120, 0, Math.PI * 2);
      ctx.fill();
      
      // Heading
      const orangeGradient = ctx.createLinearGradient(20, 40, 280, 40);
      orangeGradient.addColorStop(0, '#ff8800');
      orangeGradient.addColorStop(1, '#ff5500');
      ctx.fillStyle = orangeGradient;
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Keploy API Fellowship', canvas.width / 2, 50);
      
      // Use the global browser's Image constructor instead of Next.js Image
      const img = new window.Image();
      img.src = image;
      img.onload = () => {
        const x = canvas.width / 2;
        const y = 140;
        const radius = 80;
        // Shadow
        ctx.shadowColor = 'rgba(255, 136, 0, 0.6)';
        ctx.shadowBlur = 15;
        // Circle clip and image
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x - radius, y - radius, radius * 2, radius * 2);
        ctx.restore();
        // Reset shadow
        ctx.shadowBlur = 0;
        // Circle border
        ctx.strokeStyle = '#ff8800';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 26px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(name, x, 260);
        // GitHub username
        ctx.fillStyle = '#ff8800';
        ctx.font = '16px sans-serif';
        ctx.fillText(`@${github}`, x, 290);
        // Cohort text
        ctx.fillStyle = '#999999';
        ctx.font = 'italic 14px sans-serif';
        ctx.fillText('Cohort 2025 API Fellow', x, 320);
        ctx.strokeStyle = 'rgba(255, 136, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(50, 370);
        ctx.lineTo(canvas.width - 50, 370);
        ctx.stroke();
        ctx.fillStyle = '#777777';
        ctx.font = '12px sans-serif';
        ctx.fillText('Keploy.io', x, 400);
        // Download
        const link = document.createElement('a');
        link.download = `${name.replace(/\s/g, '_')}_keploy_id.png`;
        link.href = canvas.toDataURL();
        link.click();
      };
    };
  };

  return (
    <main className="bg-gradient-to-b from-orange-50 to-white text-gray-800 flex flex-col items-center p-8 space-y-8">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-500 to-orange-600 bg-clip-text text-transparent">
          Keploy API Fellowship
        </h1>
        <p className="text-lg text-gray-600 mt-2">Onboarding and ID Card Collection</p>
      </div>
      <form
        onSubmit={(e) => e.preventDefault()}
        className="bg-white border border-orange-100 p-8 rounded-xl shadow-lg space-y-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/50 to-orange-50/50"></div>
        <div className="relative">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">Your Name</label>
            <input
              type="text"
              placeholder="Enter Your Name"
              className="w-full p-3 rounded-lg bg-white border border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              value={name}
              onChange={(e) => onDataUpdate({ name: e.target.value })}
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">GitHub Username</label>
            <input
              type="text"
              placeholder="user-name"
              className="w-full p-3 rounded-lg bg-white border border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              value={github}
              onChange={(e) => {
                onDataUpdate({github:e.target.value})
                if (error) setError(null);
              }}
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
            <input
              type="email"
              placeholder="name@example.com"
              className="w-full p-3 rounded-lg bg-white border border-orange-200 text-gray-800 focus:ring-2 focus:ring-orange-400 focus:border-transparent transition"
              value={email}
              onChange={(e) => onDataUpdate({email:e.target.value})}
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-600 mb-1">Profile Picture</label>
            <div className="border-2 border-dashed border-orange-200 rounded-lg p-4 text-center hover:border-orange-400 transition bg-orange-50/50">
              {image ? (
                <div className="flex flex-col items-center">
                  {/* Replaced img with Next.js Image */}
                  <div className="w-24 h-24 rounded-full overflow-hidden relative">
                    <NextImage 
                      src={image} 
                      alt="Preview" 
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="96px"
                    />
                  </div>
                  <label className="text-orange-500 hover:text-orange-600 cursor-pointer text-sm mt-2">
                    Change Image
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
              ) : (
                <label className="cursor-pointer">
                  <div className="text-gray-500 mb-2">Click to upload image</div>
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>
          {error && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-lg text-orange-800">
              <p className="mb-2">{error}</p>
              <a
                href="https://github.com/keploy/keploy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-orange-600 hover:text-orange-800 underline font-medium"
              >
                Star the repository here
              </a>
              <p className="text-sm mt-2 text-gray-600">
                If you have already starred the repository and still facing issues, please wait a few minutes for GitHub&apos;s API to update or contact devrel@keploy.io
              </p>
            </div>
          )}
          <button
            onClick={handleGenerate}
            disabled={isLoading}
            className={`w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium py-3 px-4 rounded-lg transition shadow-md hover:shadow-orange-300 ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {isLoading ? 'Checking Star and Register Status...' : 'Generate ID Card'}
          </button>
          <div className="mt-4 text-sm text-gray-600 text-center">
            <p>⭐ You must star the <a href="https://github.com/keploy/keploy" target="_blank" rel="noopener noreferrer" className="text-orange-600 hover:underline">Keploy repository</a> to generate your ID card</p>
          </div>
        </div>
      </form>
      {generated && (
        <div className="mt-6 flex flex-col items-center space-y-6">
        <div className="relative p-6 rounded-xl shadow-xl w-80 flex flex-col items-center overflow-hidden">
          {/* Background image */}
          <div className="absolute inset-0">
            <NextImage 
              src="/assets/images/card-background.png" 
              alt="Card background"
              fill
              style={{ objectFit: 'cover' }}
              priority
            />
          </div>
          
          {/* Optional overlay to ensure text remains legible */}
          {/* <div className="absolute inset-0 bg-black/30"></div> */}
          
          <div className="relative z-10 flex flex-col items-center space-y-4 w-full">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Keploy API Fellowship
            </h2>
            <div className="border-4 border-orange-500/30 rounded-full p-1 shadow-lg shadow-orange-500/20">
              <div className="relative rounded-full w-32 h-32 overflow-hidden">
                <NextImage
                  src={image}
                  alt="user"
                  fill
                  style={{ objectFit: 'cover' }}
                  sizes="128px"
                />
              </div>
            </div>
            <div className="text-xl font-bold text-white">{name}</div>
            <div className="text-orange-500 font-medium">@{github}</div>
            <div className="text-sm text-gray-400 italic">Cohort 2025 API Fellow</div>
            <div className="w-full h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent my-2"></div>
            <div className="text-xs text-gray-500">Keploy.io</div>
          </div>
        </div>
        <button
          onClick={handleDownload}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-medium px-6 py-3 rounded-lg transition flex items-center space-x-2 shadow-md hover:shadow-orange-300"
        >
          <span>Download ID Card</span>
        </button>

          <canvas ref={canvasRef} width={350} height={500} style={{ display: 'none' }} />
        </div>
      )}
    </main>
  );
}