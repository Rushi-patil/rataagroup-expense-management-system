import React, { useState, useEffect, useRef } from 'react';
import { Menu, X, Sun, Shovel, Leaf, ShieldCheck, ChevronRight, MapPin, Mail } from 'lucide-react';
import styles from './HomePage.module.css';

// --- ASSET IMPORTS ---
import rataaLogo from '../../assets/logo.png';
// Updated video name as requested
import mineVideoBg from '../../assets/MainMineVideo.mp4'; 
import personVideo from '../../assets/PersonInVideo.mp4';
import mineImg2 from '../../assets/MineImage2.jpg';
import mineImg3 from '../../assets/MineImage3.jpg';
import greenMountain from '../../assets/GreenMountain.png';
import miningMachine from '../../assets/MiningMachine.png';

const HomePage = ({ onNavigateLogin }) => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // --- SCROLL OBSERVER FOR ANIMATIONS ---
  const revealRefs = useRef([]);
  revealRefs.current = [];

  const addToRefs = (el) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  };

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(styles.activeReveal);
          }
        });
      },
      { threshold: 0.15 } 
    );

    revealRefs.current.forEach((el) => observer.observe(el));

    return () => {
      window.removeEventListener('scroll', handleScroll);
      revealRefs.current.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const toggleSidebar = () => setSidebarOpen(!isSidebarOpen);

  return (
    <div className={styles.homeContainer}>
      
      {/* --- HEADER --- */}
      <header className={`${styles.header} ${scrolled ? styles.headerScrolled : ''}`}>
        <button className={styles.menuBtn} onClick={toggleSidebar} aria-label="Open Menu">
          {/* Keep icon white even on scroll because the header background is now dark green */}
          <Menu size={32} color="#fff" />
        </button>
        <div className={styles.logoWrapper}>
           <img src={rataaLogo} alt="RATAA GROUP" className={styles.logoImg} />
        </div>
        <div style={{width: '32px'}}></div>
      </header>

      {/* --- SIDEBAR --- */}
      <div className={`${styles.sidebarOverlay} ${isSidebarOpen ? styles.showOverlay : ''}`} onClick={toggleSidebar}></div>
      <div className={`${styles.sidebar} ${isSidebarOpen ? styles.openSidebar : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Navigation</h2>
          <button onClick={toggleSidebar} className={styles.closeBtn}><X size={28} /></button>
        </div>
        <div className={styles.sidebarContent}>
          <div className={styles.menuItem}>
            <span className={styles.menuLabel}>Employee Portal</span>
            <div className={styles.menuLinkGroup}>
                <span className={styles.linkText}>Expense Management System</span>
                <button className={styles.sidebarLoginBtn} onClick={onNavigateLogin}>
                    Access Portal <ChevronRight size={18} />
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- HERO SECTION (VIDEO BACKGROUND) --- */}
      <section className={styles.heroSection}>
        {/* Added fallback background color just in case, but video should load */}
        <video className={styles.bgVideo} autoPlay loop muted playsInline>
            <source src={mineVideoBg} type="video/mp4" />
        </video>
        <div className={styles.heroOverlay}></div>
        
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>
            <span className={styles.blockText}>Exploration.</span>
            <span className={styles.blockText}>Beneficiation.</span>
            <span className={`${styles.blockText} ${styles.goldText}`}>Trading.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Leading the Iron Ore Industry and Revolutionizing Energy.
          </p>
        </div>
        
        <div className={styles.scrollIndicator}>
            <div className={styles.mouse}></div>
        </div>
      </section>

      {/* --- SECTION 1: THE ORIGIN (Iron Ore) --- */}
      <section className={styles.splitSection}>
        <div className={styles.imageSide} ref={addToRefs}>
            <img src={mineImg2} alt="Open Cast Mine" />
        </div>
        <div className={`${styles.textSide} ${styles.revealRight}`} ref={addToRefs}>
            <div className={`${styles.iconBox} ${styles.animateIcon}`}><Shovel size={30} /></div>
            <h2 className={styles.animateText}>Iron Ore Pioneers</h2>
            <p className={styles.animateText}>
                We, the <strong>RATAA GROUP</strong>, commenced our journey serving the iron ore industry through exploration, mining, beneficiation, and trading. 
                With our own beneficiation plant in <strong>Sandur, Karnataka</strong>, we stand as a major exporter and domestic supplier for various steel industries throughout the country.
            </p>
        </div>
      </section>

      {/* --- SECTION 2: DIVERSIFICATION (Grid System) --- */}
      <section className={styles.diversificationSection}>
        <div className={styles.container}>
            <div className={`${styles.sectionHeader} ${styles.revealUp}`} ref={addToRefs}>
                <h2>Our Expansive Portfolio</h2>
                <div className={styles.divider}></div>
            </div>

            <div className={styles.cardGrid}>
                {/* Solar Card */}
                <div className={`${styles.featureCard} ${styles.revealUp}`} ref={addToRefs} style={{backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${greenMountain}')`}}>
                    <div className={styles.cardContent}>
                        <Sun className={styles.cardIcon} size={40} />
                        <h3>Rataa Green Energy</h3>
                        <p>
                            Incorporated in 2021, we emerged into the Solar Power Industry. We execute off-grid and on-grid solar projects and are poised to become a major player in the Solar Power industry in the State of Goa.
                        </p>
                    </div>
                </div>

                {/* Minerals Card */}
                <div className={`${styles.featureCard} ${styles.revealUp}`} style={{transitionDelay: '0.2s', backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${mineImg3}')`}} ref={addToRefs}>
                    <div className={styles.cardContent}>
                        <Leaf className={styles.cardIcon} size={40} />
                        <h3>Mines & Minerals</h3>
                        <p>
                            Stepping out from conventional business, <strong>Rataa Mines and Mineral Resources Pvt. Ltd.</strong> (2022) deals in Coal, Quartz, Met-coke, Silica Sand, Bauxite, and Mill-scale. We are a major importer of Coal commodities.
                        </p>
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* --- SECTION 3: OPERATIONS (Human Element Video) --- */}
      <section className={styles.videoFeatureSection}>
         <video className={styles.featureVideoBg} autoPlay loop muted playsInline>
            <source src={personVideo} type="video/mp4" />
        </video>
        <div className={styles.videoOverlay}>
            <div className={`${styles.centerContent} ${styles.revealZoom}`} ref={addToRefs}>
                <ShieldCheck size={60} className={styles.goldIcon} />
                <h2>Committed. Transparent. Authentic.</h2>
                <p>
                    We compose ourselves to be passionate and transparent in establishing business relations. Trustworthiness is our prime component.
                </p>
            </div>
        </div>
      </section>

      {/* --- SECTION 4: CLIENTS & SUPPLY (Background Updated) --- */}
      <section 
        className={styles.statsSection} 
        style={{backgroundImage: `url('${miningMachine}')`}}
      >
        <div className={styles.statsOverlay}></div>
        <div className={styles.container}>
            <div className={`${styles.statBox} ${styles.revealUp}`} ref={addToRefs}>
                <h1>30,000+</h1>
                <span>MTs Supplied Monthly</span>
            </div>
            
            <div className={`${styles.clientList} ${styles.revealUp}`} ref={addToRefs}>
                <h3>Proud Vendor To</h3>
                <div className={styles.clientGrid}>
                    <div className={styles.clientItem}>Mukand Ltd.</div>
                    <div className={styles.clientItem}>Kalyani Steel Ltd.</div>
                    <div className={styles.clientItem}>Electro Steel Castings</div>
                    <div className={styles.clientItem}>Kirloskar Ferrous</div>
                    <div className={styles.clientItem}>Arjas Steel Pvt. Ltd.</div>
                    <div className={styles.clientItem}>KJS Ahluwalia Group</div>
                    <div className={styles.clientItem}>MSPL Limited</div>
                    <div className={styles.clientItem}>Vedanta Ltd.</div>
                </div>
            </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
            <div className={styles.footerBrand}>
                <h2>RATAA GROUP</h2>
                <p>Rataa Mines and Mineral Resources Pvt. Ltd.</p>
            </div>
            
            <div className={styles.footerDivider}></div>

            <div className={styles.footerInfo}>
                <div className={styles.contactRow}>
                    <MapPin className={styles.footerIcon} />
                    <address>
                        1st Floor, Laxmi Estate, <br/>
                        Vaddev Nagar, Honda, Sattari, <br/>
                        North Goa, Goa - 403506
                    </address>
                </div>
                <div className={styles.contactRow}>
                    <Mail className={styles.footerIcon} />
                    <a href="mailto:info@rataagroup.com">info@rataagroup.com</a>
                </div>
            </div>
        </div>
        <div className={styles.copyright}>
            © {new Date().getFullYear()} RATAA GROUP. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
};

export default HomePage;