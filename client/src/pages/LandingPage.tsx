import React from "react";
import { useNavigate } from "react-router-dom";

const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative w-full min-h-screen bg-[#f6c4ff] flex flex-col">
      {/* Navbar */}
      <nav className="w-full h-20 bg-white shadow-lg flex items-center justify-between px-8 fixed top-0 z-50">
        <div className="font-bold text-2xl text-[#000001] hover:text-[#8A58FF] transition-colors duration-300">
          Torchbearer LMS
        </div>
        <div className="flex items-center gap-6">
          <button
            onClick={() => navigate("/login")}
            className="font-bold text-xl text-[#8A58FF] hover:text-[#7240FF] transition-colors duration-300 cursor-pointer"
          >
            Log In
          </button>
          <button
            onClick={() => navigate("/register")}
            className="button-primary cursor-pointer"
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow flex flex-col items-start justify-start px-16 py-16">
        {" "}
        {/* Hero Section */}
        <section className="w-full min-h-[calc(100vh-5rem)] flex items-center justify-between mt-4 px-8">
          {" "}
          <div className="w-[55%] pl-8">
            <h1 className="section-title leading-tight mb-8 text-7xl">
              <span className="text-[#000001]">Find the right </span>
              <span className="text-[#8A58FF]">course</span>
              <span className="text-[#000001]"> for you</span>
            </h1>
            <p className="section-subtitle text-gray-700 text-xl max-w-2xl">
              View personalized recommendations based on your interests and
              goals
            </p>
            <div className="mt-16 flex gap-8">
              <button className="button-primary px-10 py-5 text-xl cursor-pointer">
                Enroll Now
              </button>
              <button className="button-secondary px-10 py-5 text-xl cursor-pointer">
                View our blog
              </button>
            </div>
          </div>
          <div
            className="w-[40%] h-[600px] bg-transparent bg-center bg-no-repeat bg-contain"
            style={{
              backgroundImage: "url(../../hero_image.png)",
            }}
          />
        </section>
        {/* Features Sections */}
        <section className="mt-24 w-full px-8">
          <div className="flex flex-col gap-24">
            {/* Expert Coaches Section */}
            <div className="flex items-center justify-between">
              <div
                className="w-[40%] h-[600px] bg-transparent bg-center bg-no-repeat bg-contain"
                style={{
                  backgroundImage: "url(../../expert_coach.png)",
                }}
              />
              <div className="w-[55%] pl-8">
                <h2 className="section-title leading-tight mb-8 text-6xl">
                  <span className="text-[#8A58FF]">Learn</span>
                  <span className="text-[#000001]">
                    {" "}
                    from our expert coaches
                  </span>
                </h2>
                <p className="section-subtitle text-gray-700 text-xl max-w-2xl">
                  and hone your leadership skills with their help
                </p>
              </div>
            </div>

            {/* Performance Section */}
            <div className="flex items-center justify-between">
              <div className="w-[55%] pl-8">
                <h2 className="section-title leading-tight mb-8 text-6xl">
                  <span className="text-[#8A58FF]">Analyze</span>
                  <span className="text-[#000001]"> your performance</span>
                </h2>
                <p className="section-subtitle text-gray-700 text-xl max-w-2xl">
                  and get better with the help of our specially curated
                  dashboard
                </p>
              </div>
              <div
                className="w-[40%] h-[600px] bg-transparent bg-center bg-no-repeat bg-contain"
                style={{
                  backgroundImage: "url(../../performance_analysis.png)",
                }}
              />
            </div>

            {/* Leadership Section */}
            <div className="flex items-center justify-between">
              <div
                className="w-[40%] h-[600px] bg-transparent bg-center bg-no-repeat bg-contain"
                style={{
                  backgroundImage: "url(../../leadership.png)",
                }}
              />
              <div className="w-[55%] pl-8">
                <h2 className="section-title leading-tight mb-8 text-6xl">
                  <span className="text-[#000001]">Become a solid </span>
                  <span className="text-[#8A58FF]">Leader</span>
                </h2>
                <p className="section-subtitle text-gray-700 text-xl max-w-2xl">
                  Leading teams into success ventures
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full h-16 bg-white mt-32 flex items-center justify-center">
        <p className="font-semibold text-sm text-[#000001]">
          ©2025 S25 DASS Team 4. Project for uExcelerate
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
