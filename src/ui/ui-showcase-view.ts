/**
 * UI Showcase View - Comprehensive demo of modern Obsidian UI components
 * Showcases buttons, cards, animations, layouts, and styling possibilities
 */

import { ItemView, WorkspaceLeaf } from 'obsidian';
import ClippyPlugin from '../main';
import { VaultContextExtractor } from '../utils/vault-context';
import { EmbeddingManager } from '../features/knowledge-management/semantic/embedding-manager';
import { SimilarityEngine } from '../features/knowledge-management/semantic/similarity-engine';

export const VIEW_TYPE_UI_SHOWCASE = 'ui-showcase';

export class UIShowcaseView extends ItemView {
  private currentSection = 'buttons';
  private plugin: ClippyPlugin;

  constructor(leaf: WorkspaceLeaf, plugin: ClippyPlugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_UI_SHOWCASE;
  }

  getDisplayText(): string {
    return '🎨 UI Showcase';
  }

  getIcon(): string {
    return 'palette';
  }

  async onOpen(): Promise<void> {
    this.renderShowcase();
  }

  private renderShowcase(): void {
    const container = this.containerEl.children[1];
    container.empty();

    // Add comprehensive styles
    this.addShowcaseStyles();

    // Create navigation
    const nav = container.createDiv('ui-showcase-nav');
    const sections = [
      { id: 'buttons', label: '🔘 Buttons', icon: 'mouse-pointer' },
      { id: 'cards', label: '🎴 Cards & Panels', icon: 'layout-grid' },
      { id: 'inputs', label: '📝 Inputs & Forms', icon: 'edit-3' },
      { id: 'animations', label: '✨ Animations', icon: 'zap' },
      { id: 'layouts', label: '📐 Layouts', icon: 'layout' },
      { id: 'indicators', label: '🚦 Status & Progress', icon: 'activity' },
      { id: 'interactive', label: '🎮 Interactive Elements', icon: 'gamepad-2' },
      { id: 'particles', label: '🌧️ Mouse-Reactive Effects', icon: 'droplets' },
      { id: 'geometry', label: '🌸 Procedural Geometry', icon: 'hexagon' },
      { id: 'sprites', label: '🎮 Sprites & GIFs', icon: 'image' },
      { id: 'dropdowns', label: '📋 Draggable Dropdowns', icon: 'list' },
      { id: 'charts', label: '📊 Interactive Charts', icon: 'bar-chart-3' },
      { id: 'radial', label: '🌀 Radial Charts Gallery', icon: 'target' },
      { id: 'devpanel', label: '🛠️ Developer Panel', icon: 'code-2' },
      { id: 'audio', label: '🎵 Audio Visualizers', icon: 'headphones' },
      { id: 'gifs', label: '🎬 GIFs & Media', icon: 'film' },
      { id: 'placement', label: '📍 UI Placement Zones', icon: 'map-pin' },
      { id: 'themes', label: '🌙 Theme Variants', icon: 'sun' }
    ];

    sections.forEach(section => {
      const btn = nav.createEl('button', {
        text: section.label,
        cls: this.currentSection === section.id ? 'nav-btn active' : 'nav-btn'
      });
      btn.onclick = () => {
        this.currentSection = section.id;
        this.renderShowcase();
      };
    });

    // Create content area
    const content = container.createDiv('ui-showcase-content');
    
    // Render current section
    switch (this.currentSection) {
      case 'buttons':
        this.renderButtons(content);
        break;
      case 'cards':
        this.renderCards(content);
        break;
      case 'inputs':
        this.renderInputs(content);
        break;
      case 'animations':
        this.renderAnimations(content);
        break;
      case 'layouts':
        this.renderLayouts(content);
        break;
      case 'indicators':
        this.renderIndicators(content);
        break;
      case 'interactive':
        this.renderInteractive(content);
        break;
      case 'particles':
        this.renderParticles(content);
        break;
      case 'geometry':
        this.renderGeometry(content);
        break;
      case 'sprites':
        this.renderSprites(content);
        break;
      case 'dropdowns':
        this.renderDropdowns(content);
        break;
      case 'charts':
        this.renderCharts(content);
        break;
      case 'radial':
        this.renderRadialGallery(content);
        break;
      case 'devpanel':
        this.renderDeveloperPanel(content);
        break;
      case 'audio':
        this.renderAudio(content);
        break;
      case 'gifs':
        this.renderGifs(content);
        break;
      case 'placement':
        this.renderPlacement(content);
        break;
      case 'themes':
        this.renderThemes(content);
        break;
    }
  }

  private renderButtons(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🔘 Button Showcase' });

    // Primary buttons
    const primaryGroup = section.createDiv('button-group');
    primaryGroup.createEl('h3', { text: 'Primary Buttons' });
    
    const btnPrimary = primaryGroup.createEl('button', { text: 'Primary', cls: 'btn-primary' });
    const btnSecondary = primaryGroup.createEl('button', { text: 'Secondary', cls: 'btn-secondary' });
    const btnSuccess = primaryGroup.createEl('button', { text: 'Success', cls: 'btn-success' });
    const btnWarning = primaryGroup.createEl('button', { text: 'Warning', cls: 'btn-warning' });
    const btnDanger = primaryGroup.createEl('button', { text: 'Danger', cls: 'btn-danger' });

    // Styled buttons
    const styledGroup = section.createDiv('button-group');
    styledGroup.createEl('h3', { text: 'Styled Buttons' });
    
    const btnGlow = styledGroup.createEl('button', { text: '✨ Glow Effect', cls: 'btn-glow' });
    const btnGradient = styledGroup.createEl('button', { text: '🌈 Gradient', cls: 'btn-gradient' });
    const btnNeon = styledGroup.createEl('button', { text: '🔥 Neon', cls: 'btn-neon' });
    const btnGlass = styledGroup.createEl('button', { text: '🔮 Glass', cls: 'btn-glass' });

    // Icon buttons
    const iconGroup = section.createDiv('button-group');
    iconGroup.createEl('h3', { text: 'Icon Buttons' });
    
    const btnIconOnly = iconGroup.createEl('button', { text: '⚙️', cls: 'btn-icon' });
    const btnIconText = iconGroup.createEl('button', { text: '📁 Open File', cls: 'btn-icon-text' });
    const btnFloating = iconGroup.createEl('button', { text: '+', cls: 'btn-floating' });

    // Size variants
    const sizeGroup = section.createDiv('button-group');
    sizeGroup.createEl('h3', { text: 'Size Variants' });
    
    const btnSmall = sizeGroup.createEl('button', { text: 'Small', cls: 'btn-primary btn-small' });
    const btnNormal = sizeGroup.createEl('button', { text: 'Normal', cls: 'btn-primary' });
    const btnLarge = sizeGroup.createEl('button', { text: 'Large', cls: 'btn-primary btn-large' });

    // Add click handlers for demo
    [btnPrimary, btnSecondary, btnSuccess, btnWarning, btnDanger, btnGlow, btnGradient, btnNeon, btnGlass].forEach(btn => {
      btn.onclick = () => {
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 150);
      };
    });
  }

  private renderCards(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🎴 Cards & Panels' });

    const cardsGrid = section.createDiv('cards-grid');

    // Basic card
    const basicCard = cardsGrid.createDiv('card basic-card');
    basicCard.createEl('h3', { text: 'Basic Card' });
    basicCard.createEl('p', { text: 'Simple card with shadow and rounded corners.' });

    // Gradient card
    const gradientCard = cardsGrid.createDiv('card gradient-card');
    gradientCard.createEl('h3', { text: 'Gradient Card' });
    gradientCard.createEl('p', { text: 'Beautiful gradient background with glass effect.' });

    // Stat card
    const statCard = cardsGrid.createDiv('card stat-card');
    const statHeader = statCard.createDiv('stat-header');
    statHeader.createEl('span', { text: 'Total Items' });
    statHeader.createEl('span', { text: '📊', cls: 'stat-icon' });
    statCard.createEl('div', { text: '1,234', cls: 'stat-value' });
    statCard.createEl('div', { text: '+12% from last week', cls: 'stat-change positive' });

    // Interactive card
    const interactiveCard = cardsGrid.createDiv('card interactive-card');
    interactiveCard.createEl('h3', { text: 'Interactive Card' });
    interactiveCard.createEl('p', { text: 'Hover and click for effects!' });
    const cardBtn = interactiveCard.createEl('button', { text: 'Card Action', cls: 'btn-secondary' });
    
    interactiveCard.onclick = () => {
      interactiveCard.classList.add('card-clicked');
      setTimeout(() => interactiveCard.classList.remove('card-clicked'), 300);
    };

    // Progress card
    const progressCard = cardsGrid.createDiv('card progress-card');
    progressCard.createEl('h3', { text: 'Progress Card' });
    progressCard.createEl('p', { text: 'Task completion: 73%' });
    const progressBar = progressCard.createDiv('progress-bar');
    const progressFill = progressBar.createDiv('progress-fill');
    progressFill.style.width = '73%';
  }

  private renderInputs(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '📝 Inputs & Forms' });

    const formDemo = section.createDiv('form-demo');

    // Text inputs
    const inputGroup1 = formDemo.createDiv('input-group');
    inputGroup1.createEl('label', { text: 'Modern Text Input' });
    const textInput = inputGroup1.createEl('input', { cls: 'modern-input' });
    textInput.placeholder = 'Enter text here...';

    // Search input with icon
    const searchGroup = formDemo.createDiv('input-group');
    searchGroup.createEl('label', { text: 'Search Input' });
    const searchContainer = searchGroup.createDiv('search-container');
    const searchInput = searchContainer.createEl('input', { cls: 'search-input' });
    searchInput.placeholder = 'Search...';
    searchContainer.createEl('div', { text: '🔍', cls: 'search-icon' });

    // Dropdown
    const selectGroup = formDemo.createDiv('input-group');
    selectGroup.createEl('label', { text: 'Custom Dropdown' });
    const dropdown = selectGroup.createDiv('custom-dropdown');
    const dropdownBtn = dropdown.createEl('button', { text: 'Select Option ▼', cls: 'dropdown-btn' });
    const dropdownContent = dropdown.createDiv('dropdown-content');
    ['Option 1', 'Option 2', 'Option 3'].forEach(opt => {
      const option = dropdownContent.createEl('div', { text: opt, cls: 'dropdown-option' });
      option.onclick = () => {
        dropdownBtn.textContent = opt + ' ▼';
        dropdownContent.style.display = 'none';
      };
    });

    dropdownBtn.onclick = () => {
      dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
    };

    // Toggle switches
    const toggleGroup = formDemo.createDiv('input-group');
    toggleGroup.createEl('label', { text: 'Toggle Switches' });
    
    const toggle1 = toggleGroup.createDiv('toggle-switch');
    const toggleInput1 = toggle1.createEl('input', { type: 'checkbox', cls: 'toggle-input' });
    const toggleSlider1 = toggle1.createEl('span', { cls: 'toggle-slider' });
    toggle1.createEl('span', { text: 'Enable Feature' });

    const toggle2 = toggleGroup.createDiv('toggle-switch');
    const toggleInput2 = toggle2.createEl('input', { type: 'checkbox', cls: 'toggle-input modern' });
    const toggleSlider2 = toggle2.createEl('span', { cls: 'toggle-slider modern' });
    toggle2.createEl('span', { text: 'Modern Toggle' });
  }

  private renderAnimations(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '✨ Animations' });

    const animGrid = section.createDiv('animation-grid');

    // Fade in animation
    const fadeBox = animGrid.createDiv('anim-box fade-in');
    fadeBox.createEl('h4', { text: 'Fade In' });
    fadeBox.createEl('p', { text: 'Smooth fade entrance' });

    // Slide in animation
    const slideBox = animGrid.createDiv('anim-box slide-in');
    slideBox.createEl('h4', { text: 'Slide In' });
    slideBox.createEl('p', { text: 'Slides from left' });

    // Scale animation
    const scaleBox = animGrid.createDiv('anim-box scale-in');
    scaleBox.createEl('h4', { text: 'Scale In' });
    scaleBox.createEl('p', { text: 'Grows from center' });

    // Bounce animation
    const bounceBox = animGrid.createDiv('anim-box bounce-in');
    bounceBox.createEl('h4', { text: 'Bounce' });
    bounceBox.createEl('p', { text: 'Bouncy entrance' });

    // Pulse animation
    const pulseBox = animGrid.createDiv('anim-box pulse');
    pulseBox.createEl('h4', { text: 'Pulse' });
    pulseBox.createEl('p', { text: 'Continuous pulse' });

    // Rotate animation
    const rotateBox = animGrid.createDiv('anim-box rotate');
    rotateBox.createEl('div', { text: '🔄', cls: 'rotate-icon' });
    rotateBox.createEl('p', { text: 'Rotating icon' });

    // Control buttons
    const controlsGroup = section.createDiv('animation-controls');
    const replayBtn = controlsGroup.createEl('button', { text: '🔄 Replay Animations', cls: 'btn-primary' });
    replayBtn.onclick = () => {
      const animElements = section.querySelectorAll('.anim-box');
      animElements.forEach(el => {
        el.style.animation = 'none';
        setTimeout(() => el.style.animation = '', 10);
      });
    };
  }

  private renderLayouts(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '📐 Layout Examples' });

    // Flex layouts
    const flexSection = section.createDiv('layout-demo');
    flexSection.createEl('h3', { text: 'Flex Layouts' });
    
    const flexRow = flexSection.createDiv('flex-row');
    for (let i = 1; i <= 3; i++) {
      const item = flexRow.createDiv('flex-item');
      item.textContent = `Item ${i}`;
    }

    const flexGrid = flexSection.createDiv('flex-grid');
    for (let i = 1; i <= 6; i++) {
      const item = flexGrid.createDiv('grid-item');
      item.textContent = `Grid ${i}`;
    }

    // Sidebar layout
    const sidebarSection = section.createDiv('layout-demo');
    sidebarSection.createEl('h3', { text: 'Sidebar Layout' });
    
    const sidebarDemo = sidebarSection.createDiv('sidebar-demo');
    const sidebar = sidebarDemo.createDiv('demo-sidebar');
    sidebar.createEl('div', { text: 'Navigation' });
    sidebar.createEl('div', { text: 'Menu Item 1' });
    sidebar.createEl('div', { text: 'Menu Item 2' });
    
    const mainContent = sidebarDemo.createDiv('demo-main');
    mainContent.createEl('h4', { text: 'Main Content Area' });
    mainContent.createEl('p', { text: 'This is where the main content would go.' });

    // Tab layout
    const tabSection = section.createDiv('layout-demo');
    tabSection.createEl('h3', { text: 'Tab Layout' });
    
    const tabContainer = tabSection.createDiv('tab-container');
    const tabHeaders = tabContainer.createDiv('tab-headers');
    const tabContents = tabContainer.createDiv('tab-contents');

    ['Tab 1', 'Tab 2', 'Tab 3'].forEach((tabName, index) => {
      const tabHeader = tabHeaders.createEl('div', { text: tabName, cls: index === 0 ? 'tab-header active' : 'tab-header' });
      const tabContent = tabContents.createEl('div', { cls: index === 0 ? 'tab-content active' : 'tab-content' });
      tabContent.createEl('p', { text: `Content for ${tabName}` });
      
      tabHeader.onclick = () => {
        tabHeaders.querySelectorAll('.tab-header').forEach(h => h.classList.remove('active'));
        tabContents.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tabHeader.classList.add('active');
        tabContent.classList.add('active');
      };
    });
  }

  private renderIndicators(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🚦 Status & Progress Indicators' });

    // Progress bars
    const progressSection = section.createDiv('indicator-group');
    progressSection.createEl('h3', { text: 'Progress Bars' });

    // Standard progress
    const progress1 = progressSection.createDiv('progress-demo');
    progress1.createEl('span', { text: 'Loading... 65%' });
    const bar1 = progress1.createDiv('progress-bar');
    bar1.createDiv('progress-fill').style.width = '65%';

    // Animated progress
    const progress2 = progressSection.createDiv('progress-demo');
    progress2.createEl('span', { text: 'Animated Progress 80%' });
    const bar2 = progress2.createDiv('progress-bar animated');
    bar2.createDiv('progress-fill animated').style.width = '80%';

    // Circular progress
    const circularSection = section.createDiv('indicator-group');
    circularSection.createEl('h3', { text: 'Circular Indicators' });
    
    const circularGrid = circularSection.createDiv('circular-grid');
    
    // Simple spinner
    const spinner = circularGrid.createDiv('spinner-container');
    spinner.createEl('div', { cls: 'spinner' });
    spinner.createEl('p', { text: 'Loading Spinner' });

    // Status indicators
    const statusSection = section.createDiv('indicator-group');
    statusSection.createEl('h3', { text: 'Status Indicators' });
    
    const statusGrid = statusSection.createDiv('status-grid');
    
    const statuses = [
      { text: 'Online', class: 'status-online' },
      { text: 'Offline', class: 'status-offline' },
      { text: 'Warning', class: 'status-warning' },
      { text: 'Error', class: 'status-error' }
    ];

    statuses.forEach(status => {
      const statusItem = statusGrid.createDiv('status-item');
      statusItem.createDiv(`status-dot ${status.class}`);
      statusItem.createEl('span', { text: status.text });
    });

    // Badges
    const badgeSection = section.createDiv('indicator-group');
    badgeSection.createEl('h3', { text: 'Badges & Labels' });
    
    const badgeGrid = badgeSection.createDiv('badge-grid');
    
    const badges = [
      { text: '5', class: 'badge-primary' },
      { text: 'New', class: 'badge-success' },
      { text: '!', class: 'badge-warning' },
      { text: '●', class: 'badge-dot' }
    ];

    badges.forEach(badge => {
      const badgeItem = badgeGrid.createDiv('badge-item');
      badgeItem.createEl('span', { text: 'Item' });
      badgeItem.createEl('span', { text: badge.text, cls: `badge ${badge.class}` });
    });
  }

  private renderInteractive(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🎮 Interactive Elements' });

    // Sliders
    const sliderSection = section.createDiv('interactive-group');
    sliderSection.createEl('h3', { text: 'Sliders & Range Inputs' });
    
    const sliderDemo = sliderSection.createDiv('slider-demo');
    sliderDemo.createEl('label', { text: 'Volume: 50%' });
    const slider = sliderDemo.createEl('input', { type: 'range', cls: 'modern-slider' });
    slider.value = '50';
    slider.addEventListener('input', () => {
      sliderDemo.querySelector('label')!.textContent = `Volume: ${slider.value}%`;
    });

    // Rating system
    const ratingSection = section.createDiv('interactive-group');
    ratingSection.createEl('h3', { text: 'Star Rating' });
    
    const rating = ratingSection.createDiv('star-rating');
    for (let i = 1; i <= 5; i++) {
      const star = rating.createEl('span', { text: '⭐', cls: 'star' });
      star.onclick = () => {
        rating.querySelectorAll('.star').forEach((s, idx) => {
          s.classList.toggle('active', idx < i);
        });
      };
    }

    // Accordion
    const accordionSection = section.createDiv('interactive-group');
    accordionSection.createEl('h3', { text: 'Accordion' });
    
    const accordion = accordionSection.createDiv('accordion');
    for (let i = 1; i <= 3; i++) {
      const item = accordion.createDiv('accordion-item');
      const header = item.createEl('div', { text: `Section ${i}`, cls: 'accordion-header' });
      const content = item.createDiv('accordion-content');
      content.createEl('p', { text: `Content for section ${i}. Click headers to expand/collapse.` });
      
      header.onclick = () => {
        item.classList.toggle('active');
      };
    }

    // Tooltip demo
    const tooltipSection = section.createDiv('interactive-group');
    tooltipSection.createEl('h3', { text: 'Tooltips' });
    
    const tooltipDemo = tooltipSection.createDiv('tooltip-demo');
    const tooltipBtn = tooltipDemo.createEl('button', { text: 'Hover for tooltip', cls: 'btn-secondary tooltip-trigger' });
    const tooltip = tooltipDemo.createDiv('tooltip');
    tooltip.textContent = 'This is a tooltip!';
    
    tooltipBtn.addEventListener('mouseenter', () => tooltip.style.display = 'block');
    tooltipBtn.addEventListener('mouseleave', () => tooltip.style.display = 'none');
  }

  private renderParticles(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🌧️ Mouse-Reactive Effects' });
    section.createEl('p', { 
      text: 'Interactive particle systems that respond to mouse movement, creating immersive and dynamic backgrounds.' 
    });

    // Falling Rain Effect
    const rainDemo = section.createDiv('demo-card');
    rainDemo.createEl('h3', { text: '☔ Cursor-Avoiding Rain' });
    rainDemo.createEl('p', { text: 'Raindrops fall from the top and scatter away from your mouse cursor' });
    
    const rainContainer = rainDemo.createDiv('particle-demo rain-effect');
    rainContainer.id = 'rain-demo';
    
    // Mouse-Following Particles
    const followDemo = section.createDiv('demo-card');
    followDemo.createEl('h3', { text: '✨ Mouse-Following Particles' });
    followDemo.createEl('p', { text: 'Glowing particles trail behind your cursor with smooth physics' });
    
    const followContainer = followDemo.createDiv('particle-demo follow-effect');
    followContainer.id = 'follow-demo';
    
    // Repelling Bubbles
    const bubbleDemo = section.createDiv('demo-card');
    bubbleDemo.createEl('h3', { text: '🫧 Repelling Bubbles' });
    bubbleDemo.createEl('p', { text: 'Floating bubbles are pushed away by your mouse presence' });
    
    const bubbleContainer = bubbleDemo.createDiv('particle-demo bubble-effect');
    bubbleContainer.id = 'bubble-demo';
    
    // Magnetic Field Effect
    const magnetDemo = section.createDiv('demo-card');
    magnetDemo.createEl('h3', { text: '🧲 Magnetic Field' });
    magnetDemo.createEl('p', { text: 'Particles are attracted to cursor but maintain distance creating orbital patterns' });
    
    const magnetContainer = magnetDemo.createDiv('particle-demo magnet-effect');
    magnetContainer.id = 'magnet-demo';

    // Fire Effect
    const fireDemo = section.createDiv('demo-card');
    fireDemo.createEl('h3', { text: '🔥 Interactive Fire' });
    fireDemo.createEl('p', { text: 'Fire particles dance away from mouse movement' });
    
    const fireContainer = fireDemo.createDiv('particle-demo fire-effect');
    fireContainer.id = 'fire-demo';

    // Initialize all particle systems
    this.initializeParticleSystems();
  }

  private initializeParticleSystems(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      this.initRainEffect();
      this.initFollowEffect();
      this.initBubbleEffect();
      this.initMagnetEffect();
      this.initFireEffect();
    }, 100);
  }

  private initRainEffect(): void {
    const container = document.getElementById('rain-demo');
    if (!container) return;
    
    const particles: Array<{x: number, y: number, vx: number, vy: number}> = [];
    let mouseX = 0, mouseY = 0;
    
    // Create canvas
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Mouse tracking
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    // Create rain particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: 0,
        vy: 2 + Math.random() * 3
      });
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        // Calculate distance from mouse
        const dx = particle.x - mouseX;
        const dy = particle.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Apply repulsion force if mouse is nearby
        if (distance < 80) {
          const force = (80 - distance) / 80;
          particle.vx += (dx / distance) * force * 0.5;
        }
        
        // Apply gravity and movement
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.95; // Friction
        
        // Reset particle if it falls off screen
        if (particle.y > canvas.height) {
          particle.y = -10;
          particle.x = Math.random() * canvas.width;
          particle.vx = 0;
        }
        
        // Reset if too far left/right
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.x = Math.random() * canvas.width;
          particle.y = -10;
          particle.vx = 0;
        }
        
        // Draw raindrop
        ctx.fillStyle = '#4A9EFF';
        ctx.fillRect(particle.x, particle.y, 2, 8);
      });
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initFollowEffect(): void {
    const container = document.getElementById('follow-demo');
    if (!container) return;
    
    const particles: Array<{x: number, y: number, vx: number, vy: number, life: number}> = [];
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      
      // Create new particles at mouse position
      for (let i = 0; i < 3; i++) {
        particles.push({
          x: mouseX + (Math.random() - 0.5) * 20,
          y: mouseY + (Math.random() - 0.5) * 20,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 1.0
        });
      }
    });
    
    function animate() {
      ctx.fillStyle = 'rgba(20, 20, 40, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.life -= 0.02;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        
        if (particle.life <= 0) {
          particles.splice(i, 1);
          continue;
        }
        
        // Draw particle with glow effect
        ctx.save();
        ctx.globalAlpha = particle.life;
        
        const gradient = ctx.createRadialGradient(particle.x, particle.y, 0, particle.x, particle.y, 10);
        gradient.addColorStop(0, '#FFD700');
        gradient.addColorStop(0.5, '#FF6B6B');
        gradient.addColorStop(1, 'transparent');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(particle.x - 10, particle.y - 10, 20, 20);
        ctx.restore();
      }
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initBubbleEffect(): void {
    const container = document.getElementById('bubble-demo');
    if (!container) return;
    
    const bubbles: Array<{x: number, y: number, vx: number, vy: number, radius: number}> = [];
    let mouseX = 0, mouseY = 0;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    // Create bubbles
    for (let i = 0; i < 15; i++) {
      bubbles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        radius: 10 + Math.random() * 20
      });
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      bubbles.forEach(bubble => {
        // Calculate repulsion from mouse
        const dx = bubble.x - mouseX;
        const dy = bubble.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 100) {
          const force = (100 - distance) / 100 * 0.3;
          bubble.vx += (dx / distance) * force;
          bubble.vy += (dy / distance) * force;
        }
        
        // Apply movement
        bubble.x += bubble.vx;
        bubble.y += bubble.vy;
        
        // Friction
        bubble.vx *= 0.99;
        bubble.vy *= 0.99;
        
        // Bounce off walls
        if (bubble.x < bubble.radius || bubble.x > canvas.width - bubble.radius) {
          bubble.vx *= -0.8;
          bubble.x = Math.max(bubble.radius, Math.min(canvas.width - bubble.radius, bubble.x));
        }
        if (bubble.y < bubble.radius || bubble.y > canvas.height - bubble.radius) {
          bubble.vy *= -0.8;
          bubble.y = Math.max(bubble.radius, Math.min(canvas.height - bubble.radius, bubble.y));
        }
        
        // Draw bubble
        const gradient = ctx.createRadialGradient(
          bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, 0,
          bubble.x, bubble.y, bubble.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.7, 'rgba(173, 216, 230, 0.4)');
        gradient.addColorStop(1, 'rgba(100, 149, 237, 0.2)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bubble.x, bubble.y, bubble.radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.arc(bubble.x - bubble.radius * 0.3, bubble.y - bubble.radius * 0.3, bubble.radius * 0.2, 0, Math.PI * 2);
        ctx.fill();
      });
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initMagnetEffect(): void {
    const container = document.getElementById('magnet-demo');
    if (!container) return;
    
    const particles: Array<{x: number, y: number, vx: number, vy: number, angle: number}> = [];
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    // Create particles
    for (let i = 0; i < 20; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: 0,
        vy: 0,
        angle: Math.random() * Math.PI * 2
      });
    }
    
    function animate() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      particles.forEach(particle => {
        const dx = mouseX - particle.x;
        const dy = mouseY - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Magnetic attraction with orbital tendency
        if (distance > 5) {
          const force = Math.min(0.1, 50 / distance);
          const angle = Math.atan2(dy, dx);
          
          // Add orbital component
          particle.angle += 0.02;
          const orbitalForce = 0.05;
          
          particle.vx += Math.cos(angle) * force + Math.cos(particle.angle) * orbitalForce;
          particle.vy += Math.sin(angle) * force + Math.sin(particle.angle) * orbitalForce;
        }
        
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vx *= 0.95;
        particle.vy *= 0.95;
        
        // Keep particles in bounds
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
        
        // Draw particle with trail
        ctx.fillStyle = `hsl(${(distance * 2) % 360}, 70%, 60%)`;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Draw connection to mouse if close
        if (distance < 100) {
          ctx.strokeStyle = `rgba(255, 255, 255, ${(100 - distance) / 100 * 0.3})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(mouseX, mouseY);
          ctx.stroke();
        }
      });
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initFireEffect(): void {
    const container = document.getElementById('fire-demo');
    if (!container) return;
    
    const flames: Array<{x: number, y: number, vx: number, vy: number, life: number, size: number}> = [];
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    function animate() {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Create new flame particles from bottom
      if (Math.random() < 0.3) {
        flames.push({
          x: canvas.width / 2 + (Math.random() - 0.5) * 60,
          y: canvas.height - 10,
          vx: (Math.random() - 0.5) * 2,
          vy: -2 - Math.random() * 3,
          life: 1.0,
          size: 3 + Math.random() * 6
        });
      }
      
      for (let i = flames.length - 1; i >= 0; i--) {
        const flame = flames[i];
        
        // Calculate repulsion from mouse
        const dx = flame.x - mouseX;
        const dy = flame.y - mouseY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 60) {
          const force = (60 - distance) / 60 * 0.2;
          flame.vx += (dx / distance) * force;
          flame.vy += (dy / distance) * force * 0.5; // Less vertical force
        }
        
        flame.x += flame.vx;
        flame.y += flame.vy;
        flame.life -= 0.015;
        flame.vy -= 0.05; // Upward acceleration
        flame.vx *= 0.98;
        
        if (flame.life <= 0) {
          flames.splice(i, 1);
          continue;
        }
        
        // Draw flame with color gradient based on life
        const red = Math.floor(255);
        const green = Math.floor(255 * flame.life);
        const blue = Math.floor(100 * (1 - flame.life));
        
        ctx.save();
        ctx.globalAlpha = flame.life;
        ctx.fillStyle = `rgb(${red}, ${green}, ${blue})`;
        ctx.beginPath();
        ctx.arc(flame.x, flame.y, flame.size * flame.life, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private renderGeometry(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🌸 Procedural Geometry' });
    section.createEl('p', { 
      text: 'Sacred geometry and fractal patterns that evolve and respond to mouse interaction with mathematical precision.' 
    });

    // Animated Mandala
    const mandalaDemo = section.createDiv('demo-card');
    mandalaDemo.createEl('h3', { text: '🕉️ Living Mandala' });
    mandalaDemo.createEl('p', { text: 'Rotating mandala patterns with mouse-responsive symmetry and colors' });
    
    const mandalaContainer = mandalaDemo.createDiv('geometry-demo mandala-effect');
    mandalaContainer.id = 'mandala-demo';
    
    // Sierpinski Triangle
    const sierpinskiDemo = section.createDiv('demo-card');
    sierpinskiDemo.createEl('h3', { text: '🔺 Sierpinski Fractal' });
    sierpinskiDemo.createEl('p', { text: 'Self-similar triangular fractal that zooms and morphs with cursor movement' });
    
    const sierpinskiContainer = sierpinskiDemo.createDiv('geometry-demo sierpinski-effect');
    sierpinskiContainer.id = 'sierpinski-demo';
    
    // Flower of Life
    const flowerDemo = section.createDiv('demo-card');
    flowerDemo.createEl('h3', { text: '🌻 Flower of Life' });
    flowerDemo.createEl('p', { text: 'Sacred geometric pattern with animated circles and golden ratio proportions' });
    
    const flowerContainer = flowerDemo.createDiv('geometry-demo flower-effect');
    flowerContainer.id = 'flower-demo';
    
    // Julia Set Fractal
    const juliaDemo = section.createDiv('demo-card');
    juliaDemo.createEl('h3', { text: '🌀 Julia Set' });
    juliaDemo.createEl('p', { text: 'Complex fractal that morphs based on mouse position creating infinite detail' });
    
    const juliaContainer = juliaDemo.createDiv('geometry-demo julia-effect');
    juliaContainer.id = 'julia-demo';

    // Geometric Kaleidoscope
    const kaleidoDemo = section.createDiv('demo-card');
    kaleidoDemo.createEl('h3', { text: '🎆 Kaleidoscope' });
    kaleidoDemo.createEl('p', { text: 'Symmetrical geometric patterns that mirror and rotate around your cursor' });
    
    const kaleidoContainer = kaleidoDemo.createDiv('geometry-demo kaleido-effect');
    kaleidoContainer.id = 'kaleido-demo';

    // Initialize all geometry systems
    this.initializeGeometrySystems();
  }

  private initializeGeometrySystems(): void {
    // Wait for DOM to be ready
    setTimeout(() => {
      this.initMandalaEffect();
      this.initSierpinskiEffect();
      this.initFlowerOfLifeEffect();
      this.initJuliaSetEffect();
      this.initKaleidoscopeEffect();
    }, 100);
  }

  private initMandalaEffect(): void {
    const container = document.getElementById('mandala-demo');
    if (!container) return;
    
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    let time = 0;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Mouse influence
      const mouseInfluence = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2) / 100;
      const mouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      
      time += 0.02;
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Draw multiple layers of mandala
      for (let layer = 0; layer < 5; layer++) {
        const radius = 30 + layer * 20 + mouseInfluence * 10;
        const petals = 8 + Math.floor(mouseInfluence);
        const rotation = time * (0.5 + layer * 0.2) + mouseAngle * 0.1;
        
        ctx.strokeStyle = `hsl(${(time * 50 + layer * 60 + mouseInfluence * 30) % 360}, 70%, ${60 - layer * 5}%)`;
        ctx.lineWidth = 3 - layer * 0.3;
        
        for (let i = 0; i < petals; i++) {
          const angle = (i / petals) * Math.PI * 2 + rotation;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Draw petal
          ctx.beginPath();
          ctx.arc(x, y, 8 + Math.sin(time * 3 + i) * 3, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw connecting lines
          if (i > 0) {
            const prevAngle = ((i - 1) / petals) * Math.PI * 2 + rotation;
            const prevX = Math.cos(prevAngle) * radius;
            const prevY = Math.sin(prevAngle) * radius;
            
            ctx.beginPath();
            ctx.moveTo(prevX, prevY);
            ctx.lineTo(x, y);
            ctx.stroke();
          }
        }
      }
      
      ctx.restore();
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initSierpinskiEffect(): void {
    const container = document.getElementById('sierpinski-demo');
    if (!container) return;
    
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    let zoom = 1;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      zoom = 1 + (mouseX / container.clientWidth) * 2;
    });
    
    function drawSierpinski(ctx: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, depth: number) {
      if (depth === 0) {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.lineTo(cx, cy);
        ctx.closePath();
        ctx.stroke();
        return;
      }
      
      const abx = (ax + bx) / 2;
      const aby = (ay + by) / 2;
      const bcx = (bx + cx) / 2;
      const bcy = (by + cy) / 2;
      const cax = (cx + ax) / 2;
      const cay = (cy + ay) / 2;
      
      drawSierpinski(ctx, ax, ay, abx, aby, cax, cay, depth - 1);
      drawSierpinski(ctx, abx, aby, bx, by, bcx, bcy, depth - 1);
      drawSierpinski(ctx, cax, cay, bcx, bcy, cx, cy, depth - 1);
    }
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const size = 80 * zoom;
      
      // Triangle points
      const ax = centerX;
      const ay = centerY - size;
      const bx = centerX - size * Math.cos(Math.PI / 6);
      const by = centerY + size * Math.sin(Math.PI / 6);
      const cx = centerX + size * Math.cos(Math.PI / 6);
      const cy = centerY + size * Math.sin(Math.PI / 6);
      
      const depth = Math.floor(3 + (mouseY / container.clientHeight) * 3);
      
      ctx.strokeStyle = `hsl(${(mouseX / container.clientWidth) * 360}, 70%, 60%)`;
      ctx.lineWidth = 1;
      
      drawSierpinski(ctx, ax, ay, bx, by, cx, cy, depth);
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initFlowerOfLifeEffect(): void {
    const container = document.getElementById('flower-demo');
    if (!container) return;
    
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    let time = 0;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      time += 0.02;
      const mouseInfluence = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2) / 50;
      const baseRadius = 25 + Math.sin(time) * 5;
      
      ctx.strokeStyle = `hsl(${(time * 30 + mouseInfluence * 60) % 360}, 70%, 60%)`;
      ctx.lineWidth = 2;
      
      // Central circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Surrounding circles (6-fold symmetry)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2 + time * 0.1;
        const distance = baseRadius + mouseInfluence * 5;
        const x = centerX + Math.cos(angle) * distance;
        const y = centerY + Math.sin(angle) * distance;
        
        ctx.beginPath();
        ctx.arc(x, y, baseRadius, 0, Math.PI * 2);
        ctx.stroke();
        
        // Second ring
        for (let j = 0; j < 2; j++) {
          const angle2 = angle + (j * Math.PI / 3);
          const x2 = x + Math.cos(angle2) * distance;
          const y2 = y + Math.sin(angle2) * distance;
          
          if (x2 > 0 && x2 < canvas.width && y2 > 0 && y2 < canvas.height) {
            ctx.beginPath();
            ctx.arc(x2, y2, baseRadius * 0.8, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      }
      
      requestAnimationFrame(animate);
    }
    animate();
  }

  private initJuliaSetEffect(): void {
    const container = document.getElementById('julia-demo');
    if (!container) return;
    
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    function julia(zx: number, zy: number, cx: number, cy: number): number {
      let i = 0;
      const maxIter = 80;
      
      while (i < maxIter && (zx * zx + zy * zy) < 4) {
        const temp = zx * zx - zy * zy + cx;
        zy = 2 * zx * zy + cy;
        zx = temp;
        i++;
      }
      
      return i;
    }
    
    function animate() {
      const cx = (mouseX / canvas.width - 0.5) * 2;
      const cy = (mouseY / canvas.height - 0.5) * 2;
      
      const zoom = 0.005;
      
      for (let x = 0; x < canvas.width; x += 2) {
        for (let y = 0; y < canvas.height; y += 2) {
          const zx = (x - canvas.width / 2) * zoom;
          const zy = (y - canvas.height / 2) * zoom;
          
          const iter = julia(zx, zy, cx, cy);
          const color = iter === 80 ? 0 : (iter * 3) % 255;
          
          const index = (y * canvas.width + x) * 4;
          
          imageData.data[index] = color;
          imageData.data[index + 1] = (color * 2) % 255;
          imageData.data[index + 2] = (color * 3) % 255;
          imageData.data[index + 3] = 255;
          
          // Fill adjacent pixels for performance
          if (x + 1 < canvas.width) {
            const index2 = (y * canvas.width + x + 1) * 4;
            imageData.data[index2] = imageData.data[index];
            imageData.data[index2 + 1] = imageData.data[index + 1];
            imageData.data[index2 + 2] = imageData.data[index + 2];
            imageData.data[index2 + 3] = 255;
          }
          
          if (y + 1 < canvas.height) {
            const index3 = ((y + 1) * canvas.width + x) * 4;
            imageData.data[index3] = imageData.data[index];
            imageData.data[index3 + 1] = imageData.data[index + 1];
            imageData.data[index3 + 2] = imageData.data[index + 2];
            imageData.data[index3 + 3] = 255;
            
            if (x + 1 < canvas.width) {
              const index4 = ((y + 1) * canvas.width + x + 1) * 4;
              imageData.data[index4] = imageData.data[index];
              imageData.data[index4 + 1] = imageData.data[index + 1];
              imageData.data[index4 + 2] = imageData.data[index + 2];
              imageData.data[index4 + 3] = 255;
            }
          }
        }
      }
      
      ctx.putImageData(imageData, 0, 0);
      
      setTimeout(() => requestAnimationFrame(animate), 100); // Slower refresh for performance
    }
    animate();
  }

  private initKaleidoscopeEffect(): void {
    const container = document.getElementById('kaleido-demo');
    if (!container) return;
    
    let mouseX = container.clientWidth / 2;
    let mouseY = container.clientHeight / 2;
    let time = 0;
    
    const canvas = document.createElement('canvas');
    canvas.width = container.clientWidth;
    canvas.height = 200;
    container.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    container.addEventListener('mousemove', (e) => {
      const rect = container.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });
    
    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      time += 0.02;
      const segments = 8;
      const mouseAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
      const mouseDistance = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
      
      ctx.save();
      ctx.translate(centerX, centerY);
      
      for (let i = 0; i < segments; i++) {
        ctx.save();
        ctx.rotate((i / segments) * Math.PI * 2);
        
        // Create mirroring effect
        if (i % 2 === 1) {
          ctx.scale(1, -1);
        }
        
        // Draw geometric shapes
        for (let j = 1; j <= 3; j++) {
          const radius = j * 20 + Math.sin(time + j) * 10;
          const sides = 3 + j;
          
          ctx.strokeStyle = `hsl(${(time * 60 + i * 45 + mouseDistance) % 360}, 70%, 60%)`;
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          for (let k = 0; k <= sides; k++) {
            const angle = (k / sides) * Math.PI * 2 + mouseAngle * 0.1;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (k === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      ctx.restore();
      requestAnimationFrame(animate);
    }
    animate();
  }

  private renderSprites(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🎮 Sprites & GIFs' });
    section.createEl('p', { 
      text: 'Demonstrate sprite sheet animations and GIF controls with conditional switching based on user interaction.' 
    });

    // Sprite Sheet Character Animation
    const spriteDemo = section.createDiv('demo-card');
    spriteDemo.createEl('h3', { text: '🏃 Sprite Sheet Character' });
    spriteDemo.createEl('p', { text: 'CSS sprite animation with multiple states controlled by buttons' });
    
    const spriteContainer = spriteDemo.createDiv('sprite-demo');
    const character = spriteContainer.createDiv('sprite-character');
    character.addClass('idle-animation');
    
    const spriteControls = spriteContainer.createDiv('sprite-controls');
    const idleBtn = spriteControls.createEl('button', { text: 'Idle', cls: 'sprite-btn active' });
    const walkBtn = spriteControls.createEl('button', { text: 'Walk', cls: 'sprite-btn' });
    const runBtn = spriteControls.createEl('button', { text: 'Run', cls: 'sprite-btn' });
    const jumpBtn = spriteControls.createEl('button', { text: 'Jump', cls: 'sprite-btn' });
    
    // GIF Animation Controls
    const gifDemo = section.createDiv('demo-card');
    gifDemo.createEl('h3', { text: '🎬 Conditional GIF Loading' });
    gifDemo.createEl('p', { text: 'Switch between different GIF animations based on conditions' });
    
    const gifContainer = gifDemo.createDiv('gif-demo');
    const gifPlayer = gifContainer.createDiv('gif-player');
    const gifDisplay = gifPlayer.createDiv('gif-display');
    
    const gifControls = gifContainer.createDiv('gif-controls');
    const loadingBtn = gifControls.createEl('button', { text: '⏳ Loading', cls: 'gif-btn active' });
    const successBtn = gifControls.createEl('button', { text: '✅ Success', cls: 'gif-btn' });
    const errorBtn = gifControls.createEl('button', { text: '❌ Error', cls: 'gif-btn' });
    const celebrateBtn = gifControls.createEl('button', { text: '🎉 Celebrate', cls: 'gif-btn' });
    
    // Progress Bar with Sprite Icons
    const progressDemo = section.createDiv('demo-card');
    progressDemo.createEl('h3', { text: '📊 Progress with Sprites' });
    progressDemo.createEl('p', { text: 'Progress bar that changes sprite animation based on completion percentage' });
    
    const progressContainer = progressDemo.createDiv('progress-demo');
    const progressBar = progressContainer.createDiv('progress-bar');
    const progressFill = progressBar.createDiv('progress-fill');
    const progressSprite = progressFill.createDiv('progress-sprite');
    
    const progressControls = progressContainer.createDiv('progress-controls');
    const startProgressBtn = progressControls.createEl('button', { text: 'Start Progress', cls: 'progress-btn' });
    const resetProgressBtn = progressControls.createEl('button', { text: 'Reset', cls: 'progress-btn' });
    
    // Icon State Switcher
    const iconDemo = section.createDiv('demo-card');
    iconDemo.createEl('h3', { text: '⚡ Dynamic Icon States' });
    iconDemo.createEl('p', { text: 'Icons that change sprites based on application state' });
    
    const iconContainer = iconDemo.createDiv('icon-demo');
    
    const statusIcon = iconContainer.createDiv('status-icon-group');
    statusIcon.createEl('span', { text: 'Connection: ' });
    const connectionIcon = statusIcon.createDiv('status-icon connection-icon online');
    const connectionLabel = statusIcon.createEl('span', { text: 'Online', cls: 'status-label' });
    
    const batteryIcon = iconContainer.createDiv('status-icon-group');
    batteryIcon.createEl('span', { text: 'Battery: ' });
    const batterySprite = batteryIcon.createDiv('status-icon battery-icon full');
    const batteryLabel = batteryIcon.createEl('span', { text: '100%', cls: 'status-label' });
    
    const iconControls = iconContainer.createDiv('icon-controls');
    const toggleConnection = iconControls.createEl('button', { text: 'Toggle Connection', cls: 'icon-btn' });
    const drainBattery = iconControls.createEl('button', { text: 'Drain Battery', cls: 'icon-btn' });
    
    // Interactive Card Flip Animation
    const cardDemo = section.createDiv('demo-card');
    cardDemo.createEl('h3', { text: '🎴 Interactive Card Flip' });
    cardDemo.createEl('p', { text: 'Card flip animation using sprite transitions' });
    
    const cardContainer = cardDemo.createDiv('card-flip-demo');
    const flipCard = cardContainer.createDiv('flip-card');
    const cardFront = flipCard.createDiv('card-face card-front');
    const cardBack = flipCard.createDiv('card-face card-back');
    
    const flipBtn = cardContainer.createEl('button', { text: 'Flip Card', cls: 'flip-btn' });

    // Initialize sprite animations
    this.initializeSpriteAnimations(character, spriteControls, gifDisplay, gifControls, 
                                   progressFill, progressSprite, progressControls,
                                   connectionIcon, connectionLabel, batterySprite, batteryLabel, iconControls,
                                   flipCard, flipBtn);
  }

  private initializeSpriteAnimations(
    character: HTMLElement, 
    spriteControls: HTMLElement,
    gifDisplay: HTMLElement,
    gifControls: HTMLElement,
    progressFill: HTMLElement,
    progressSprite: HTMLElement,
    progressControls: HTMLElement,
    connectionIcon: HTMLElement,
    connectionLabel: HTMLElement,
    batterySprite: HTMLElement,
    batteryLabel: HTMLElement,
    iconControls: HTMLElement,
    flipCard: HTMLElement,
    flipBtn: HTMLElement
  ): void {
    
    // Sprite Character Animation Controls
    const spriteButtons = spriteControls.querySelectorAll('.sprite-btn');
    spriteButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const animation = target.textContent?.toLowerCase();
        
        // Remove all animation classes
        character.removeClass('idle-animation', 'walk-animation', 'run-animation', 'jump-animation');
        
        // Remove active class from all buttons
        spriteButtons.forEach(b => b.removeClass('active'));
        target.addClass('active');
        
        // Add new animation class
        character.addClass(`${animation}-animation`);
      });
    });

    // GIF Animation Controls
    const gifButtons = gifControls.querySelectorAll('.gif-btn');
    gifButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        const gifType = target.textContent?.toLowerCase().split(' ')[1];
        
        // Remove all gif classes
        gifDisplay.removeClass('loading-gif', 'success-gif', 'error-gif', 'celebrate-gif');
        
        // Remove active class from all buttons
        gifButtons.forEach(b => b.removeClass('active'));
        target.addClass('active');
        
        // Add new gif class
        gifDisplay.addClass(`${gifType}-gif`);
      });
    });

    // Progress Bar Animation
    let progressInterval: number;
    let currentProgress = 0;
    
    progressControls.querySelector('.progress-btn')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.textContent === 'Start Progress') {
        currentProgress = 0;
        target.textContent = 'Stop';
        
        progressInterval = window.setInterval(() => {
          currentProgress += 2;
          progressFill.style.width = `${currentProgress}%`;
          
          // Change sprite based on progress
          progressSprite.removeClass('progress-starting', 'progress-working', 'progress-finishing', 'progress-complete');
          
          if (currentProgress < 25) {
            progressSprite.addClass('progress-starting');
          } else if (currentProgress < 75) {
            progressSprite.addClass('progress-working');
          } else if (currentProgress < 100) {
            progressSprite.addClass('progress-finishing');
          } else {
            progressSprite.addClass('progress-complete');
            clearInterval(progressInterval);
            target.textContent = 'Start Progress';
          }
        }, 100);
      } else {
        clearInterval(progressInterval);
        target.textContent = 'Start Progress';
      }
    });
    
    // Reset button
    progressControls.querySelectorAll('.progress-btn')[1]?.addEventListener('click', () => {
      clearInterval(progressInterval);
      currentProgress = 0;
      progressFill.style.width = '0%';
      progressSprite.removeClass('progress-starting', 'progress-working', 'progress-finishing', 'progress-complete');
      (progressControls.querySelector('.progress-btn') as HTMLElement).textContent = 'Start Progress';
    });

    // Connection Icon Toggle
    let isOnline = true;
    iconControls.querySelectorAll('.icon-btn')[0]?.addEventListener('click', () => {
      isOnline = !isOnline;
      connectionIcon.removeClass('online', 'offline');
      connectionIcon.addClass(isOnline ? 'online' : 'offline');
      connectionLabel.textContent = isOnline ? 'Online' : 'Offline';
    });

    // Battery Icon Drain
    let batteryLevel = 100;
    iconControls.querySelectorAll('.icon-btn')[1]?.addEventListener('click', () => {
      batteryLevel -= 25;
      if (batteryLevel < 0) batteryLevel = 100;
      
      batterySprite.removeClass('full', 'high', 'medium', 'low');
      
      if (batteryLevel > 75) {
        batterySprite.addClass('full');
      } else if (batteryLevel > 50) {
        batterySprite.addClass('high');
      } else if (batteryLevel > 25) {
        batterySprite.addClass('medium');
      } else {
        batterySprite.addClass('low');
      }
      
      batteryLabel.textContent = `${batteryLevel}%`;
    });

    // Card Flip Animation
    let isFlipped = false;
    flipBtn.addEventListener('click', () => {
      isFlipped = !isFlipped;
      flipCard.removeClass('flipped');
      if (isFlipped) {
        flipCard.addClass('flipped');
      }
      flipBtn.textContent = isFlipped ? 'Flip Back' : 'Flip Card';
    });
  }

  private renderDropdowns(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '📋 Draggable Dropdowns' });
    section.createEl('p', { 
      text: 'Interactive dropdown/accordion components with draggable headers and list items in various aesthetic styles.' 
    });

    // Modern Glass Dropdown
    const glassDemo = section.createDiv('demo-card');
    glassDemo.createEl('h3', { text: '✨ Glass Morphism Style' });
    glassDemo.createEl('p', { text: 'Modern glassmorphism design with blur effects and transparency' });
    
    const glassContainer = glassDemo.createDiv('dropdown-container glass-style');
    const glassDropdown = this.createDropdown('glass-dropdown', 'Glass Projects', [
      { id: '1', text: 'User Interface Design', icon: '🎨' },
      { id: '2', text: 'Frontend Development', icon: '⚡' },
      { id: '3', text: 'API Integration', icon: '🔗' },
      { id: '4', text: 'Testing & QA', icon: '🧪' }
    ], 'glass');
    glassContainer.appendChild(glassDropdown);

    // Neon Cyberpunk Dropdown
    const neonDemo = section.createDiv('demo-card');
    neonDemo.createEl('h3', { text: '🌈 Neon Cyberpunk Style' });
    neonDemo.createEl('p', { text: 'Futuristic neon design with glowing borders and animations' });
    
    const neonContainer = neonDemo.createDiv('dropdown-container neon-style');
    const neonDropdown = this.createDropdown('neon-dropdown', 'Cyber Tasks', [
      { id: '1', text: 'Neural Network Training', icon: '🧠' },
      { id: '2', text: 'Data Encryption', icon: '🔒' },
      { id: '3', text: 'System Monitoring', icon: '📊' },
      { id: '4', text: 'Security Audit', icon: '🛡️' }
    ], 'neon');
    neonContainer.appendChild(neonDropdown);

    // Nature Wood Dropdown
    const woodDemo = section.createDiv('demo-card');
    woodDemo.createEl('h3', { text: '🌿 Natural Wood Style' });
    woodDemo.createEl('p', { text: 'Organic wood texture with earth tones and natural shadows' });
    
    const woodContainer = woodDemo.createDiv('dropdown-container wood-style');
    const woodDropdown = this.createDropdown('wood-dropdown', 'Garden Plans', [
      { id: '1', text: 'Plant New Herbs', icon: '🌱' },
      { id: '2', text: 'Water Vegetables', icon: '💧' },
      { id: '3', text: 'Harvest Fruits', icon: '🍎' },
      { id: '4', text: 'Compost Setup', icon: '♻️' }
    ], 'wood');
    woodContainer.appendChild(woodDropdown);

    // Minimalist Paper Dropdown
    const paperDemo = section.createDiv('demo-card');
    paperDemo.createEl('h3', { text: '📝 Paper Minimalist Style' });
    paperDemo.createEl('p', { text: 'Clean paper-like design with subtle shadows and typography focus' });
    
    const paperContainer = paperDemo.createDiv('dropdown-container paper-style');
    const paperDropdown = this.createDropdown('paper-dropdown', 'Study Notes', [
      { id: '1', text: 'Mathematics Review', icon: '📐' },
      { id: '2', text: 'Literature Analysis', icon: '📚' },
      { id: '3', text: 'Science Experiments', icon: '⚗️' },
      { id: '4', text: 'History Timeline', icon: '📜' }
    ], 'paper');
    paperContainer.appendChild(paperDropdown);

    // Dark Terminal Dropdown
    const terminalDemo = section.createDiv('demo-card');
    terminalDemo.createEl('h3', { text: '💻 Terminal Hacker Style' });
    terminalDemo.createEl('p', { text: 'Retro terminal design with monospace fonts and green-on-black theme' });
    
    const terminalContainer = terminalDemo.createDiv('dropdown-container terminal-style');
    const terminalDropdown = this.createDropdown('terminal-dropdown', 'root@system:~$', [
      { id: '1', text: 'ls -la /projects', icon: '📁' },
      { id: '2', text: 'git push origin main', icon: '🔄' },
      { id: '3', text: 'npm run build', icon: '⚙️' },
      { id: '4', text: 'docker compose up', icon: '🐳' }
    ], 'terminal');
    terminalContainer.appendChild(terminalDropdown);

    // Initialize drag and drop functionality
    this.initializeDragAndDrop();
    
    // Initialize heights after all dropdowns are created and in the DOM
    this.initializeDropdownHeights();
  }

  private renderCharts(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '📊 Interactive Charts' });
    section.createEl('p', { 
      text: 'Comprehensive data visualization showcase with various chart types built using HTML5 Canvas.' 
    });

    // Charts grid
    const chartsGrid = section.createDiv('charts-grid');

    // Pie Chart
    const pieDemo = chartsGrid.createDiv('chart-demo');
    pieDemo.createEl('h3', { text: '🥧 Pie Chart' });
    const pieCanvas = pieDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    pieCanvas.width = 300;
    pieCanvas.height = 300;
    this.drawPieChart(pieCanvas);

    // Bar Chart
    const barDemo = chartsGrid.createDiv('chart-demo');
    barDemo.createEl('h3', { text: '📊 Bar Chart' });
    const barCanvas = barDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    barCanvas.width = 300;
    barCanvas.height = 300;
    this.drawBarChart(barCanvas);

    // Line Chart
    const lineDemo = chartsGrid.createDiv('chart-demo');
    lineDemo.createEl('h3', { text: '📈 Line Chart' });
    const lineCanvas = lineDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    lineCanvas.width = 300;
    lineCanvas.height = 300;
    this.drawLineChart(lineCanvas);

    // Area Chart
    const areaDemo = chartsGrid.createDiv('chart-demo');
    areaDemo.createEl('h3', { text: '🏔️ Area Chart' });
    const areaCanvas = areaDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    areaCanvas.width = 300;
    areaCanvas.height = 300;
    this.drawAreaChart(areaCanvas);

    // Radial Chart
    const radialDemo = chartsGrid.createDiv('chart-demo');
    radialDemo.createEl('h3', { text: '⭕ Radial Chart' });
    const radialCanvas = radialDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    radialCanvas.width = 300;
    radialCanvas.height = 300;
    this.drawRadialChart(radialCanvas);

    // Column Chart
    const columnDemo = chartsGrid.createDiv('chart-demo');
    columnDemo.createEl('h3', { text: '📋 Column Chart' });
    const columnCanvas = columnDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    columnCanvas.width = 300;
    columnCanvas.height = 300;
    this.drawColumnChart(columnCanvas);

    // Triangle Chart
    const triangleDemo = chartsGrid.createDiv('chart-demo');
    triangleDemo.createEl('h3', { text: '📐 Triangle Chart' });
    const triangleCanvas = triangleDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    triangleCanvas.width = 300;
    triangleCanvas.height = 300;
    this.drawTriangleChart(triangleCanvas);

    // Bubble Chart
    const bubbleDemo = chartsGrid.createDiv('chart-demo');
    bubbleDemo.createEl('h3', { text: '🫧 Bubble Chart' });
    const bubbleCanvas = bubbleDemo.createEl('canvas', { cls: 'chart-canvas' }) as HTMLCanvasElement;
    bubbleCanvas.width = 300;
    bubbleCanvas.height = 300;
    this.drawBubbleChart(bubbleCanvas);

    // Interactive Controls
    const controlsDemo = section.createDiv('chart-controls');
    controlsDemo.createEl('h3', { text: '🎮 Interactive Controls' });
    
    const controlsGroup = controlsDemo.createDiv('controls-group');
    const animateBtn = controlsGroup.createEl('button', { text: '▶️ Animate Charts', cls: 'btn-primary' });
    const randomizeBtn = controlsGroup.createEl('button', { text: '🎲 Randomize Data', cls: 'btn-secondary' });
    const colorSchemeBtn = controlsGroup.createEl('button', { text: '🌈 Change Colors', cls: 'btn-accent' });

    // Animation controls
    let isAnimating = false;
    animateBtn.onclick = () => {
      isAnimating = !isAnimating;
      animateBtn.textContent = isAnimating ? '⏸️ Stop Animation' : '▶️ Animate Charts';
      if (isAnimating) {
        this.animateCharts();
      }
    };

    randomizeBtn.onclick = () => {
      this.randomizeChartData();
    };

    colorSchemeBtn.onclick = () => {
      this.cycleColorScheme();
    };
  }

  private renderRadialGallery(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🌀 Radial Charts Gallery' });
    section.createEl('p', { 
      text: 'A comprehensive collection of radial chart variations - from circular progress indicators to complex multi-layered radial visualizations.' 
    });

    // Radial charts grid
    const radialGrid = section.createDiv('radial-gallery-grid');

    // 1. Radial Line Chart (like your monthly data reference)
    const radialLineDemo = radialGrid.createDiv('radial-chart-demo featured');
    radialLineDemo.createEl('h3', { text: '📊 Radial Line Chart' });
    radialLineDemo.createEl('p', { text: 'Time series data displayed in circular format with grid lines' });
    const radialLineCanvas = radialLineDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    radialLineCanvas.width = 350;
    radialLineCanvas.height = 350;
    this.drawRadialLineChart(radialLineCanvas);

    // 2. Concentric Ring Chart (like your bar chart reference)
    const concentricDemo = radialGrid.createDiv('radial-chart-demo featured');
    concentricDemo.createEl('h3', { text: '🎯 Concentric Ring Chart' });
    concentricDemo.createEl('p', { text: 'Multi-category data in concentric rings with value scales' });
    const concentricCanvas = concentricDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    concentricCanvas.width = 350;
    concentricCanvas.height = 350;
    this.drawConcentricRingChart(concentricCanvas);

    // 3. Radial Segment Chart (like your mobile subscriptions reference)
    const segmentDemo = radialGrid.createDiv('radial-chart-demo featured');
    segmentDemo.createEl('h3', { text: '🌐 Radial Segment Chart' });
    segmentDemo.createEl('p', { text: 'Complex hierarchical data with layered radial segments' });
    const segmentCanvas = segmentDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    segmentCanvas.width = 350;
    segmentCanvas.height = 350;
    this.drawRadialSegmentChart(segmentCanvas);

    // 4. Progress Ring Chart
    const progressDemo = radialGrid.createDiv('radial-chart-demo');
    progressDemo.createEl('h3', { text: '⭕ Progress Ring Chart' });
    progressDemo.createEl('p', { text: 'Animated circular progress indicators' });
    const progressCanvas = progressDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    progressCanvas.width = 300;
    progressCanvas.height = 300;
    this.drawProgressRingChart(progressCanvas);

    // 5. Radar/Spider Chart
    const radarDemo = radialGrid.createDiv('radial-chart-demo');
    radarDemo.createEl('h3', { text: '🕷️ Radar Chart' });
    radarDemo.createEl('p', { text: 'Multi-axis comparison in radial format' });
    const radarCanvas = radarDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    radarCanvas.width = 300;
    radarCanvas.height = 300;
    this.drawRadarChart(radarCanvas);

    // 6. Sunburst Chart
    const sunburstDemo = radialGrid.createDiv('radial-chart-demo');
    sunburstDemo.createEl('h3', { text: '☀️ Sunburst Chart' });
    sunburstDemo.createEl('p', { text: 'Hierarchical data in nested radial layers' });
    const sunburstCanvas = sunburstDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    sunburstCanvas.width = 300;
    sunburstCanvas.height = 300;
    this.drawSunburstChart(sunburstCanvas);

    // 7. Clock Chart
    const clockDemo = radialGrid.createDiv('radial-chart-demo');
    clockDemo.createEl('h3', { text: '🕐 Clock Chart' });
    clockDemo.createEl('p', { text: 'Time-based data visualization' });
    const clockCanvas = clockDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    clockCanvas.width = 300;
    clockCanvas.height = 300;
    this.drawClockChart(clockCanvas);

    // 8. Gauge Chart
    const gaugeDemo = radialGrid.createDiv('radial-chart-demo');
    gaugeDemo.createEl('h3', { text: '📏 Gauge Chart' });
    gaugeDemo.createEl('p', { text: 'Performance metrics in gauge format' });
    const gaugeCanvas = gaugeDemo.createEl('canvas', { cls: 'radial-canvas' }) as HTMLCanvasElement;
    gaugeCanvas.width = 300;
    gaugeCanvas.height = 300;
    this.drawGaugeChart(gaugeCanvas);

    // Interactive Controls Section
    const controlsDemo = section.createDiv('radial-controls');
    controlsDemo.createEl('h3', { text: '🎮 Radial Chart Controls' });
    
    const controlsGroup = controlsDemo.createDiv('radial-controls-group');
    const animateRadialBtn = controlsGroup.createEl('button', { text: '🌀 Animate All', cls: 'btn-primary' });
    const randomizeRadialBtn = controlsGroup.createEl('button', { text: '🎲 Randomize Data', cls: 'btn-secondary' });
    const themeRadialBtn = controlsGroup.createEl('button', { text: '🎨 Change Theme', cls: 'btn-accent' });
    const speedBtn = controlsGroup.createEl('button', { text: '⚡ Toggle Speed', cls: 'btn-warning' });

    // Animation state
    let radialAnimationState = {
      isAnimating: false,
      speed: 1,
      theme: 0
    };

    animateRadialBtn.onclick = () => {
      radialAnimationState.isAnimating = !radialAnimationState.isAnimating;
      animateRadialBtn.textContent = radialAnimationState.isAnimating ? '⏸️ Stop Animation' : '🌀 Animate All';
      if (radialAnimationState.isAnimating) {
        this.startRadialAnimations();
      } else {
        this.stopRadialAnimations();
      }
    };

    randomizeRadialBtn.onclick = () => {
      this.randomizeRadialData();
    };

    themeRadialBtn.onclick = () => {
      this.cycleRadialTheme();
    };

    speedBtn.onclick = () => {
      radialAnimationState.speed = radialAnimationState.speed === 1 ? 2 : radialAnimationState.speed === 2 ? 0.5 : 1;
      speedBtn.textContent = `⚡ Speed: ${radialAnimationState.speed}x`;
      this.updateAnimationSpeed(radialAnimationState.speed);
    };
  }

  private renderDeveloperPanel(container: HTMLElement): void {
    const section = container.createDiv('showcase-section dev-panel-showcase');
    section.createEl('h2', { text: '🛠️ Developer Panel' });
    section.createEl('p', { 
      text: 'Professional AI chat interface showcase demonstrating world-class plugin UI patterns from the Clippy ecosystem.' 
    });

    // Main dev panel container
    const devPanel = section.createDiv('dev-panel');
    
    // Left side - Chat Interface
    const chatSection = devPanel.createDiv('chat-section');
    chatSection.createEl('h3', { text: '💬 AI Chat Interface', cls: 'section-title' });
    
    // Chat controls header
    const chatControls = chatSection.createDiv('chat-controls');
    
    // Color scheme selector
    const colorGroup = chatControls.createDiv('control-group');
    colorGroup.createEl('label', { text: 'Chat Colors:' });
    const colorSelect = colorGroup.createEl('select', { cls: 'dev-select' }) as HTMLSelectElement;
    ['Default', 'Ocean', 'Sunset', 'Forest', 'Cyberpunk', 'Monochrome'].forEach(scheme => {
      const option = colorSelect.createEl('option');
      option.value = scheme.toLowerCase();
      option.textContent = scheme;
    });

    // Thinking toggle
    const thinkingGroup = chatControls.createDiv('control-group');
    const thinkingToggle = thinkingGroup.createEl('button', { text: '🧠 Show Thinking', cls: 'dev-toggle active' });
    
    // Audio controls row
    const audioRow = chatControls.createDiv('audio-controls-row');
    
    // TTS Circular Visualizer
    const ttsVisualizerContainer = audioRow.createDiv('tts-visualizer-container');
    const ttsCanvas = ttsVisualizerContainer.createEl('canvas', { cls: 'tts-visualizer-canvas' }) as HTMLCanvasElement;
    ttsCanvas.width = 60;
    ttsCanvas.height = 60;
    const ttsLabel = ttsVisualizerContainer.createDiv('tts-emoji');
    ttsLabel.textContent = '💋';
    
    // STT Visualizer (similar to TTS)
    const sttVisualizerContainer = audioRow.createDiv('stt-visualizer-container');
    const sttCanvas = sttVisualizerContainer.createEl('canvas', { cls: 'stt-visualizer-canvas' }) as HTMLCanvasElement;
    sttCanvas.width = 60;
    sttCanvas.height = 60;
    const sttLabel = sttVisualizerContainer.createDiv('stt-emoji');
    sttLabel.textContent = '🎤';

    // Wake word visualizer (matching STT design)
    const wakeVisualizerContainer = audioRow.createDiv('wake-visualizer-container');
    const wakeCanvas = wakeVisualizerContainer.createEl('canvas', { cls: 'wake-visualizer-canvas' }) as HTMLCanvasElement;
    wakeCanvas.width = 60;
    wakeCanvas.height = 60;
    const wakeLabel = wakeVisualizerContainer.createDiv('wake-emoji');
    wakeLabel.textContent = '👋';

    // Audio visualizer selector
    const vizGroup = audioRow.createDiv('control-group compact');
    vizGroup.createEl('label', { text: 'Visualizer:' });
    const vizSelect = vizGroup.createEl('select', { cls: 'dev-select' }) as HTMLSelectElement;
    ['Waveform', 'Spectrum', 'Circular', 'Bars', 'Particles'].forEach(viz => {
      const option = vizSelect.createEl('option');
      option.value = viz.toLowerCase();
      option.textContent = viz;
    });

    // Chat window
    const chatWindow = chatSection.createDiv('chat-window');
    
    // Audio visualizer (initially hidden)
    const audioVizContainer = chatWindow.createDiv('audio-visualizer-container hidden');
    const audioVizCanvas = audioVizContainer.createEl('canvas', { cls: 'audio-viz-canvas' }) as HTMLCanvasElement;
    audioVizCanvas.width = 300;
    audioVizCanvas.height = 60;

    // Chat messages container
    const messagesContainer = chatWindow.createDiv('chat-messages');

    // Chat input area (moved into chat section)
    const inputForm = chatSection.createDiv('input-form');
    const messageInput = inputForm.createEl('textarea', { 
      cls: 'dev-textarea',
      placeholder: 'Type a message to test the AI chat interface...'
    }) as HTMLTextAreaElement;
    messageInput.value = 'Explain how radial charts work and help me understand their use cases.';
    
    const inputControls = inputForm.createDiv('input-controls');
    const sendBtn = inputControls.createEl('button', { text: '📤 Send Message', cls: 'dev-button primary' });
    const sampleBtn = inputControls.createEl('button', { text: '🎲 Load Sample', cls: 'dev-button secondary' });

    // Vault Intelligence Buttons
    const vaultControls = inputForm.createDiv('vault-intelligence-controls');
    vaultControls.createEl('h4', { text: '🧠 Vault Intelligence', cls: 'controls-title' });
    
    const intelligenceRow1 = vaultControls.createDiv('intelligence-row');
    const currentNoteBtn = intelligenceRow1.createEl('button', { text: '📄 Current Note', cls: 'dev-button vault-btn' });
    const vaultStatsBtn = intelligenceRow1.createEl('button', { text: '📊 Vault Stats', cls: 'dev-button vault-btn' });
    const tagAnalysisBtn = intelligenceRow1.createEl('button', { text: '🏷️ Tag Analysis', cls: 'dev-button vault-btn' });
    
    // New row for semantic features
    const intelligenceRow3 = vaultControls.createDiv('intelligence-row');
    const semanticSearchBtn = intelligenceRow3.createEl('button', { text: '🔍 Semantic Search', cls: 'dev-button vault-btn semantic' });
    const vaultAuditBtn = intelligenceRow3.createEl('button', { text: '🔬 Vault Audit', cls: 'dev-button vault-btn audit' });
    const embeddingStatsBtn = intelligenceRow3.createEl('button', { text: '🧮 Embedding Cache', cls: 'dev-button vault-btn cache' });
    
    const intelligenceRow2 = vaultControls.createDiv('intelligence-row');
    const linkAnalysisBtn = intelligenceRow2.createEl('button', { text: '🔗 Link Analysis', cls: 'dev-button vault-btn' });
    const vaultWorkspaceBtn = intelligenceRow2.createEl('button', { text: '🖥️ Workspace', cls: 'dev-button vault-btn' });
    const fullContextBtn = intelligenceRow2.createEl('button', { text: '🌍 Full Context', cls: 'dev-button vault-btn highlight' });

    // Right side - Code Console
    const consoleSection = devPanel.createDiv('console-section');
    consoleSection.createEl('h3', { text: '📜 Code Console', cls: 'section-title' });
    
    const consoleWindow = consoleSection.createDiv('console-window');
    const consoleOutput = consoleWindow.createDiv('console-output');
    
    // Console controls
    const consoleControls = consoleSection.createDiv('console-controls');
    const clearConsole = consoleControls.createEl('button', { text: '🗑️ Clear', cls: 'dev-button secondary' });
    const exportLogs = consoleControls.createEl('button', { text: '📤 Export', cls: 'dev-button secondary' });
    
    // Advanced Features Section
    const advancedSection = consoleSection.createDiv('advanced-features');
    advancedSection.createEl('h4', { text: '⚡ Advanced Features', cls: 'feature-title' });
    
    const featuresGrid = advancedSection.createDiv('features-grid');
    
    // File operations demo
    const fileOpsDemo = featuresGrid.createDiv('feature-demo');
    fileOpsDemo.createEl('h5', { text: '📁 File Operations' });
    const fileOpsBtn = fileOpsDemo.createEl('button', { text: 'Demo File Reading', cls: 'demo-button' });
    
    // Plugin settings demo  
    const settingsDemo = featuresGrid.createDiv('feature-demo');
    settingsDemo.createEl('h5', { text: '⚙️ Settings API' });
    const settingsBtn = settingsDemo.createEl('button', { text: 'Load Plugin Settings', cls: 'demo-button' });
    
    // Workspace API demo
    const workspaceDemo = featuresGrid.createDiv('feature-demo');
    workspaceDemo.createEl('h5', { text: '🏗️ Workspace API' });
    const workspaceBtn = workspaceDemo.createEl('button', { text: 'Get Active View', cls: 'demo-button' });
    
    // Vault API demo
    const vaultDemo = featuresGrid.createDiv('feature-demo');
    vaultDemo.createEl('h5', { text: '🗃️ Vault Operations' });
    const vaultBtn = vaultDemo.createEl('button', { text: 'List Recent Files', cls: 'demo-button' });
    
    // AI Features demo
    const aiDemo = featuresGrid.createDiv('feature-demo');
    aiDemo.createEl('h5', { text: '🤖 AI Integration' });
    const aiBtn = aiDemo.createEl('button', { text: 'Process with AI', cls: 'demo-button' });
    
    // Memory management demo
    const memoryDemo = featuresGrid.createDiv('feature-demo');
    memoryDemo.createEl('h5', { text: '🧠 Memory System' });
    const memoryBtn = memoryDemo.createEl('button', { text: 'Show Memory Stats', cls: 'demo-button' });
    
    // Performance Monitor Section
    const perfSection = consoleSection.createDiv('performance-monitor');
    perfSection.createEl('h4', { text: '📊 System Performance', cls: 'feature-title' });
    
    const perfMetrics = perfSection.createDiv('perf-metrics');
    const cpuMetric = perfMetrics.createDiv('metric-item');
    cpuMetric.innerHTML = '<span class="metric-label">CPU Usage:</span><span class="metric-value" id="cpu-value">23%</span>';
    
    const memMetric = perfMetrics.createDiv('metric-item');
    memMetric.innerHTML = '<span class="metric-label">Memory:</span><span class="metric-value" id="mem-value">847MB</span>';
    
    const apiMetric = perfMetrics.createDiv('metric-item');
    apiMetric.innerHTML = '<span class="metric-label">API Latency:</span><span class="metric-value" id="api-value">0.8s</span>';
    
    const tokenMetric = perfMetrics.createDiv('metric-item');
    tokenMetric.innerHTML = '<span class="metric-label">Token Rate:</span><span class="metric-value" id="token-value">42/min</span>';


    // State management
    let devPanelState = {
      colorScheme: 'default',
      showThinking: true,
      ttsEnabled: false,
      sttEnabled: false,
      wakeWordEnabled: false,
      currentViz: 'waveform',
      messageCount: 0
    };

    // Store state on section for external access
    (section as any).__devPanelState = devPanelState;

    // Sample conversations for demo
    const sampleMessages = [
      'Explain how radial charts work and help me understand their use cases.',
      'What are the best practices for implementing voice interfaces in applications?',
      'Help me debug this TypeScript error in my Obsidian plugin.',
      'Generate a color scheme for my data visualization dashboard.',
      'Explain the difference between Canvas API and SVG for chart rendering.'
    ];

    const sampleAIResponses = [
      {
        thinking: 'The user is asking about radial charts. I should explain their structure, benefits, and common use cases. I\'ll cover polar coordinates, data representation methods, and when to choose radial over linear charts.',
        response: 'Radial charts display data in a circular format using polar coordinates instead of traditional x-y axes. They\'re excellent for:\n\n• **Cyclical data** (time, seasonal patterns)\n• **Multi-dimensional comparisons** (radar charts)\n• **Hierarchical relationships** (sunburst charts)\n• **Progress visualization** (gauges, rings)\n\nKey advantages include space efficiency, aesthetic appeal, and intuitive representation of cyclical or comparative data. However, they can be harder to read precisely compared to linear charts.'
      },
      {
        thinking: 'Voice interfaces are complex. I should cover technical implementation, user experience considerations, accessibility, and best practices for audio feedback and recognition.',
        response: 'Voice interface best practices include:\n\n**Technical Implementation:**\n• Use Web Speech API or specialized libraries\n• Implement noise cancellation and echo reduction\n• Provide visual feedback during voice processing\n\n**User Experience:**\n• Clear audio cues for recording states\n• Fallback options for voice failures\n• Configurable wake words and sensitivity\n• Visual confirmation of voice commands\n\n**Accessibility:**\n• Support for different accents and languages\n• Adjustable playback speeds for TTS\n• Visual alternatives for audio-only interactions'
      }
    ];

    // Event handlers
    colorSelect.onchange = () => {
      devPanelState.colorScheme = colorSelect.value;
      this.updateChatColorScheme(messagesContainer, devPanelState.colorScheme);
      this.logToConsole(consoleOutput, 'COLOR_SCHEME', `Changed to ${devPanelState.colorScheme}`);
    };

    thinkingToggle.onclick = () => {
      devPanelState.showThinking = !devPanelState.showThinking;
      thinkingToggle.textContent = devPanelState.showThinking ? '🧠 Hide Thinking' : '🧠 Show Thinking';
      thinkingToggle.classList.toggle('active');
      this.toggleThinkingVisibility(messagesContainer, devPanelState.showThinking);
      this.logToConsole(consoleOutput, 'THINKING_TOGGLE', `Thinking visibility: ${devPanelState.showThinking}`);
    };

    ttsVisualizerContainer.onclick = () => {
      devPanelState.ttsEnabled = !devPanelState.ttsEnabled;
      ttsVisualizerContainer.classList.toggle('active');
      this.logToConsole(consoleOutput, 'TTS_TOGGLE', `Text-to-Speech: ${devPanelState.ttsEnabled ? 'enabled' : 'disabled'}`);
      
      if (devPanelState.ttsEnabled) {
        // Show both visualizers when TTS is enabled
        audioVizContainer.removeClass('hidden');
        this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'TTS enabled - will use Piper/OpenAI TTS with real audio visualization');
      } else {
        audioVizContainer.addClass('hidden');
        this.stopCurrentSpeech();
        this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'TTS disabled');
      }
    };

    // Initialize STT visualizer
    this.initializeSTTVisualizer(sttCanvas, sttLabel);
    
    sttVisualizerContainer.onclick = () => {
      devPanelState.sttEnabled = !devPanelState.sttEnabled;
      sttVisualizerContainer.classList.toggle('active');
      this.logToConsole(consoleOutput, 'STT_TOGGLE', `Speech-to-Text: ${devPanelState.sttEnabled ? 'enabled' : 'disabled'}`);
      
      if (devPanelState.sttEnabled) {
        this.startSTTListening(sttCanvas, consoleOutput);
      } else {
        this.stopSTTListening();
      }
    };

    // Initialize wake word visualizer
    this.initializeWakeWordVisualizer(wakeCanvas, wakeLabel);
    
    wakeVisualizerContainer.onclick = async () => {
      devPanelState.wakeWordEnabled = !devPanelState.wakeWordEnabled;
      wakeVisualizerContainer.classList.toggle('active');
      this.logToConsole(consoleOutput, 'WAKE_WORD', `Wake word detection: ${devPanelState.wakeWordEnabled ? 'enabled' : 'disabled'}`);
      
      if (devPanelState.wakeWordEnabled) {
        await this.startWakeWordDetection(consoleOutput, wakeCanvas);
      } else {
        await this.stopWakeWordDetection(consoleOutput);
      }
    };

    vizSelect.onchange = () => {
      devPanelState.currentViz = vizSelect.value;
      this.logToConsole(consoleOutput, 'VISUALIZER', `Changed to ${devPanelState.currentViz}`);
      if (devPanelState.ttsEnabled) {
        this.simulateAudioVisualization(audioVizCanvas, devPanelState.currentViz);
      }
    };

    sendBtn.onclick = () => {
      const message = messageInput.value.trim();
      if (message) {
        this.addChatMessage(messagesContainer, message, 'user', devPanelState);
        this.logToConsole(consoleOutput, 'USER_MESSAGE', message.substring(0, 50) + '...');
        
        // Generate real AI response
        this.generateAIResponse(message, messagesContainer, consoleOutput, devPanelState, audioVizCanvas, ttsCanvas);
        
        messageInput.value = '';
      }
    };

    sampleBtn.onclick = () => {
      const randomMessage = sampleMessages[Math.floor(Math.random() * sampleMessages.length)];
      messageInput.value = randomMessage;
      this.logToConsole(consoleOutput, 'SAMPLE_LOAD', randomMessage.substring(0, 30) + '...');
    };

    // Vault Intelligence Button Handlers
    const vaultExtractor = new VaultContextExtractor(this.app);
    
    // Initialize semantic search components using existing RAG settings
    console.log('🔍 SEMANTIC: Initializing embedding manager with RAG settings...');
    console.log('🔍 SEMANTIC: RAG Provider:', this.plugin.settings.rag.embeddings.provider);
    console.log('🔍 SEMANTIC: RAG Model:', this.plugin.settings.rag.embeddings.model);
    console.log('🔍 SEMANTIC: Ollama URL:', this.plugin.settings.rag.embeddings.ollamaUrl);
    
    const pluginDataPath = (this.plugin as any).manifest?.dir || '.obsidian/plugins/clippy-ai-assistant';
    
    // Use the existing shared embedding manager and similarity engine from the plugin
    // These are initialized at plugin load with persistent storage enabled
    const embeddingManager = this.plugin.embeddingManager;
    const similarityEngine = this.plugin.similarityEngine;
    
    if (!embeddingManager) {
      console.error('🔍 SEMANTIC ERROR: Plugin embedding manager not available. This should be initialized at plugin startup.');
      return;
    }
    
    console.log('🔍 SEMANTIC: Using shared embedding manager with persistent storage from plugin');

    currentNoteBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', 'Analyzing current note...');
      try {
        const context = await vaultExtractor.getQuickContext();
        const currentNote = context.currentNote!;
        
        const noteInfo = `📄 CURRENT NOTE ANALYSIS:
• Name: ${currentNote.name || 'None selected'}
• Path: ${currentNote.path || 'N/A'}
• Word Count: ${currentNote.wordCount} words
• Tags: ${currentNote.tags.length > 0 ? currentNote.tags.join(', ') : 'None'}
• Outgoing Links: ${currentNote.outlinks.length}
• Incoming Backlinks: ${currentNote.backlinks.length}
• Created: ${currentNote.createdDate ? currentNote.createdDate.toLocaleDateString() : 'Unknown'}
• Modified: ${currentNote.modifiedDate ? currentNote.modifiedDate.toLocaleDateString() : 'Unknown'}

${currentNote.frontmatter ? '📋 Frontmatter: ' + JSON.stringify(currentNote.frontmatter, null, 2) : ''}`;

        messageInput.value = `Analyze this note information and provide insights:\n\n${noteInfo}`;
        this.logToConsole(consoleOutput, 'CURRENT_NOTE', `Loaded info for: ${currentNote.name || 'No note'}`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to get current note: ${error.message}`);
      }
    };

    vaultStatsBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', 'Gathering vault statistics...');
      try {
        const context = await vaultExtractor.extractFullContext();
        const stats = context.vaultStats;
        
        const totalTagUsages = Object.values(context.tagAnalysis.tagCounts).reduce((sum, count) => sum + count, 0);
        
        const statsInfo = `📊 VAULT STATISTICS:
• Total Notes: ${stats.totalNotes}
• Total Attachments: ${stats.totalAttachments}
• Unique Tags: ${stats.totalTags}
• Total Tag Usages: ${totalTagUsages}
• Average Note Length: ${stats.avgNoteLength} words
• Oldest Note: ${stats.oldestNote?.toLocaleDateString() || 'Unknown'}
• Newest Note: ${stats.newestNote?.toLocaleDateString() || 'Unknown'}
• Recently Modified: ${stats.recentlyModified.slice(0, 5).map(f => f.name).join(', ')}

📈 CONTENT OVERVIEW:
• Reading Time: ${context.contentPatterns.readingTimeEstimate}
• File Types: ${Object.entries(context.contentPatterns.contentTypes).map(([ext, count]) => `${ext}: ${count}`).join(', ')}

🏷️ TAG AUDIT:
• Most Used: ${context.tagAnalysis.topTags.slice(0, 3).map(t => `#${t.tag} (${t.count})`).join(', ')}
• Tag Coverage: ${Math.round((totalTagUsages / stats.totalNotes) * 100)}% of notes have tags`;

        messageInput.value = `Here are my vault statistics. What insights can you provide?\n\n${statsInfo}`;
        this.logToConsole(consoleOutput, 'VAULT_STATS', `Found ${stats.totalNotes} notes, ${stats.totalTags} tags`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to get vault stats: ${error.message}`);
      }
    };

    tagAnalysisBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', 'Analyzing tag usage...');
      try {
        const context = await vaultExtractor.extractFullContext();
        const tags = context.tagAnalysis;
        
        const tagInfo = `🏷️ TAG ANALYSIS:
• Total Tags: ${tags.allTags.length}
• Most Used Tags: ${tags.topTags.slice(0, 10).map(t => `#${t.tag} (${t.count})`).join(', ')}
• Orphan Tags (used once): ${tags.orphanTags.length} tags
${tags.orphanTags.length > 0 ? '\n• Some Orphans: ' + tags.orphanTags.slice(0, 5).join(', ') : ''}

📋 TAG RECOMMENDATIONS:
Consider consolidating similar tags or developing a consistent tagging strategy.`;

        messageInput.value = `Analyze my tag usage and suggest improvements:\n\n${tagInfo}`;
        this.logToConsole(consoleOutput, 'TAG_ANALYSIS', `Found ${tags.allTags.length} tags, ${tags.orphanTags.length} orphans`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to analyze tags: ${error.message}`);
      }
    };

    linkAnalysisBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', 'Analyzing link relationships...');
      try {
        const context = await vaultExtractor.extractFullContext();
        const links = context.linkAnalysis;
        
        const linkInfo = `🔗 LINK ANALYSIS:
• Total Links: ${links.totalLinks}
• Most Linked Notes: ${links.mostLinkedNotes.slice(0, 5).map(n => `"${n.file}" (${n.linkCount} links)`).join(', ')}
• Orphan Notes (no backlinks): ${links.orphanNotes.length} notes
${links.brokenLinks.length > 0 ? `\n• Broken Links: ${links.brokenLinks.slice(0, 3).join(', ')}` : ''}

🌐 GRAPH HEALTH:
Your knowledge graph connectivity and potential improvements.`;

        messageInput.value = `Analyze my note linking patterns and suggest improvements:\n\n${linkInfo}`;
        this.logToConsole(consoleOutput, 'LINK_ANALYSIS', `${links.totalLinks} links, ${links.orphanNotes.length} orphans`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to analyze links: ${error.message}`);
      }
    };

    vaultWorkspaceBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', 'Gathering workspace state...');
      try {
        const context = await vaultExtractor.getQuickContext();
        const workspace = context.workspace!;
        
        const workspaceInfo = `🖥️ WORKSPACE STATE:
• Open Tabs: ${workspace.openTabs.length > 0 ? workspace.openTabs.join(', ') : 'None'}
• Active View: ${workspace.activeViewType}
• Left Sidebar: ${workspace.sidebarsOpen.left ? 'Open' : 'Closed'}
• Right Sidebar: ${workspace.sidebarsOpen.right ? 'Open' : 'Closed'}
• Recent Files: ${workspace.recentFiles.slice(0, 5).join(', ') || 'None'}

💡 WORKSPACE INSIGHTS:
Current session activity and navigation patterns.`;

        messageInput.value = `Here's my current workspace state. Any suggestions for productivity?\n\n${workspaceInfo}`;
        this.logToConsole(consoleOutput, 'WORKSPACE', `${workspace.openTabs.length} tabs, active: ${workspace.activeViewType}`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to get workspace info: ${error.message}`);
      }
    };

    fullContextBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'VAULT_INTEL', '🧠 Extracting FULL vault intelligence...');
      try {
        const context = await vaultExtractor.extractFullContext();
        const aiReadyContext = vaultExtractor.formatForAI(context);
        
        messageInput.value = `I'm providing you with comprehensive intelligence about my Obsidian vault. Please analyze it and give me insights about my knowledge management patterns, productivity opportunities, and suggestions for improvement:\n\n${aiReadyContext}`;
        this.logToConsole(consoleOutput, 'FULL_CONTEXT', `Complete vault analysis loaded - ${aiReadyContext.length} characters`);
      } catch (error) {
        this.logToConsole(consoleOutput, 'VAULT_ERROR', `Failed to extract full context: ${error.message}`);
      }
    };

    // Semantic Search Button Handler (Now with actual semantic search!)
    semanticSearchBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'SEMANTIC', '🔍 Performing semantic search...');
      try {
        const activeFile = this.app.workspace.getActiveFile();
        if (!activeFile) {
          messageInput.value = `🔍 SEMANTIC SEARCH - No Active File\n\nPlease open a markdown note to perform semantic search.\n\nThis feature will analyze your current note's content and find other notes with similar meaning using AI embeddings.`;
          this.logToConsole(consoleOutput, 'SEMANTIC_INFO', 'No active file - please open a note');
          return;
        }

        this.logToConsole(consoleOutput, 'SEMANTIC', `Analyzing "${activeFile.basename}" for similar notes...`);

        const content = await this.app.vault.read(activeFile);
        const allFiles = this.app.vault.getMarkdownFiles(); // Process ALL files in vault
        
        this.logToConsole(consoleOutput, 'SEMANTIC', `Found ${allFiles.length} total notes in vault. Processing all for semantic comparison...`);
        
        // Prepare note contents for analysis
        const noteContents: Array<{path: string; title: string; content: string}> = [];
        for (const file of allFiles) {
          if (file.path === activeFile.path) continue; // Skip the current file
          try {
            const fileContent = await this.app.vault.read(file);
            noteContents.push({
              path: file.path,
              title: file.basename,
              content: fileContent
            });
          } catch (err) {
            console.warn(`Failed to read ${file.path}`);
          }
        }

        this.logToConsole(consoleOutput, 'SEMANTIC', `Computing semantic similarities using embeddings...`);

        // Test Ollama connectivity first
        try {
          this.logToConsole(consoleOutput, 'SEMANTIC', 'Testing Ollama connectivity...');
          const testResponse = await fetch('http://localhost:11434/api/tags');
          if (testResponse.ok) {
            const models = await testResponse.json();
            this.logToConsole(consoleOutput, 'SEMANTIC', `✅ Ollama connected. Available models: ${models.models?.map((m: any) => m.name).join(', ') || 'none'}`);
            
            // Check if the configured embedding model is available
            const configuredModel = this.plugin.settings.rag.embeddings.model;
            const modelExists = models.models?.some((m: any) => m.name === configuredModel);
            
            if (modelExists) {
              this.logToConsole(consoleOutput, 'SEMANTIC', `✅ Configured embedding model "${configuredModel}" is available in Ollama`);
            } else {
              this.logToConsole(consoleOutput, 'SEMANTIC', `⚠️ Configured embedding model "${configuredModel}" NOT found in Ollama!`);
              this.logToConsole(consoleOutput, 'SEMANTIC', `   This will cause fallback to hash-based embeddings (artificially high similarity)`);
            }
          } else {
            this.logToConsole(consoleOutput, 'SEMANTIC', '⚠️ Ollama connected but /api/tags failed');
          }
        } catch (error) {
          this.logToConsole(consoleOutput, 'SEMANTIC', `❌ Ollama not accessible: ${error}. Will use fallback embeddings.`);
        }

        // Use RAG settings for chunk size if available
        const maxTokens = this.plugin.settings.rag.embeddings.maxTokens || 2048;
        const chunkSize = Math.min(maxTokens * 3, 3000); // Rough char to token conversion
        
        this.logToConsole(consoleOutput, 'SEMANTIC', `Using chunk size: ${chunkSize} characters (from RAG maxTokens: ${maxTokens})`);
        
        // Log embedding configuration details
        const embeddingModel = this.plugin.settings.rag.embeddings.model;
        const embeddingDimensions = this.plugin.settings.rag.embeddings.dimensions;
        const embeddingMaxTokens = this.plugin.settings.rag.embeddings.maxTokens;
        
        this.logToConsole(consoleOutput, 'SEMANTIC', `📊 Embedding Configuration:`);
        this.logToConsole(consoleOutput, 'SEMANTIC', `   Model: ${embeddingModel}`);
        this.logToConsole(consoleOutput, 'SEMANTIC', `   Dimensions: ${embeddingDimensions || 'auto-detect'}`);
        this.logToConsole(consoleOutput, 'SEMANTIC', `   Max Tokens: ${embeddingMaxTokens || 'auto-detect'}`);

        // Find similar notes using the actual similarity engine
        this.logToConsole(consoleOutput, 'SEMANTIC', `🧠 Computing embeddings and similarities...`);
        const similarities = await similarityEngine.findSimilarNotes(
          content.substring(0, chunkSize), // Use RAG-configured chunk size
          noteContents,
          { minSimilarity: 0.15, maxResults: 15 } // Lower threshold, more results
        );

        const resultsText = similarities.length > 0 
          ? similarities.map(sim => {
              const noteName = sim.noteB.replace(/\.md$/, '').split('/').pop() || sim.noteB;
              let result = `• **${noteName}** (${(sim.similarity * 100).toFixed(1)}% similarity)\n  └ _${sim.relationshipType}_: ${sim.reason}`;
              
              // Add chunk citations for transparency
              if (sim.targetChunk) {
                result += `\n  📄 **Relevant excerpt**: "${sim.targetChunk.substring(0, 150)}${sim.targetChunk.length > 150 ? '...' : ''}"`;
              }
              
              // Add matching concepts if available
              if (sim.matchingConcepts && sim.matchingConcepts.length > 0) {
                result += `\n  🔗 **Key concepts**: ${sim.matchingConcepts.slice(0, 3).join(', ')}`;
              }
              
              return result;
            }).join('\n\n')
          : 'No semantic similarities found above 20% threshold.';

        messageInput.value = `🔍 SEMANTIC SEARCH RESULTS for "${activeFile.basename}":

Found ${similarities.length} semantically similar notes:

${resultsText}

💡 **How this works**: Each note's content is analyzed to extract the most meaningful chunks, then converted to ${embeddingManager.getAvailableModels()[0]?.dimensions || 'multi'}-dimensional vectors using the **${embeddingManager.getAvailableModels()[0]?.name || 'local embedding'}** model. These vectors are compared using cosine similarity to find conceptual connections.

📄 **New features**: 
• **Smart chunk extraction** finds the most relevant content sections for analysis
• **Chunk citation** shows exactly which text was used to determine relationships  
• **Concept matching** highlights key shared concepts between notes
• **Improved relationship classification** with more accurate semantic, topical, and methodical connections

🎯 **Next steps**: Would you like me to analyze these relationships further, suggest ways to link these notes, or help you organize this content into a Map of Content (MoC)?`;
        
        this.logToConsole(consoleOutput, 'SEMANTIC_SUCCESS', `Found ${similarities.length} semantic connections using AI embeddings`);
        
      } catch (error) {
        this.logToConsole(consoleOutput, 'SEMANTIC_ERROR', `Semantic search failed: ${(error as Error).message}`);
        messageInput.value = `🔍 SEMANTIC SEARCH - ERROR\n\n${(error as Error).message}\n\n🔧 **Troubleshooting:**\n• Make sure Ollama is running on http://localhost:11434\n• Check that you have the nomic-embed-text model installed\n• Verify the plugin has permission to access the file system\n\nSee console for technical details.`;
      }
    };

    // Vault Audit Button Handler (Simplified for debugging)
    vaultAuditBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'AUDIT', '🔬 Testing vault audit button...');
      try {
        const context = await vaultExtractor.extractFullContext();
        
        const basicAuditInfo = `🔬 VAULT AUDIT - BASIC ANALYSIS

📊 VAULT STATISTICS:
• Total Notes: ${context.vaultStats.totalNotes}
• Total Tags: ${context.vaultStats.totalTags}
• Average Note Length: ${context.vaultStats.avgNoteLength} words

🏷️ TOP TAGS (showing first 10):
${context.tagAnalysis.topTags.slice(0, 10).map(t => `• ${t.tag} (used ${t.count} times)`).join('\n')}

🔗 LINK ANALYSIS:
• Total Links: ${context.linkAnalysis.totalLinks}
• Orphan Notes: ${context.linkAnalysis.orphanNotes.length}

⚙️ Advanced semantic analysis and MoC enhancement coming soon!`;

        messageInput.value = basicAuditInfo;
        
        this.logToConsole(consoleOutput, 'AUDIT_SUCCESS', `Basic audit complete! ${context.vaultStats.totalNotes} notes analyzed`);
        
      } catch (error) {
        this.logToConsole(consoleOutput, 'AUDIT_ERROR', `Vault audit failed: ${(error as Error).message}`);
        messageInput.value = `🔬 VAULT AUDIT - ERROR\n\n${(error as Error).message}\n\nPlease check the console for details.`;
      }
    };

    // Enhanced Embedding Cache Stats Button Handler with validation
    embeddingStatsBtn.onclick = async () => {
      this.logToConsole(consoleOutput, 'CACHE', '🧮 Getting comprehensive cache statistics...');
      try {
        const stats = embeddingManager.getCacheStats();
        const availableModels = embeddingManager.getAvailableModels();
        
        // Validate cache and check for stale entries
        this.logToConsole(consoleOutput, 'CACHE', 'Validating cache freshness...');
        const allFiles = this.app.vault.getMarkdownFiles();
        const vaultFileCount = allFiles.length;
        const cacheHitRatio = stats.persistent?.totalEmbeddings ? 
          Math.min((stats.persistent.totalEmbeddings / vaultFileCount) * 100, 100) : 0;
        
        // Check for stale cache entries using actual validation
        let validationResults: {
          totalEntries: number;
          validEntries: number;
          staleEntries: number;
          missingFiles: string[];
          outdatedEntries: string[];
        } | null = null;
        if (embeddingManager.persistentStorage?.isReady()) {
          try {
            validationResults = await embeddingManager.persistentStorage.validateCache();
            this.logToConsole(consoleOutput, 'CACHE', `Cache validation: ${validationResults.validEntries} valid, ${validationResults.staleEntries} stale`);
          } catch (error) {
            this.logToConsole(consoleOutput, 'CACHE_WARN', `Cache validation failed: ${(error as Error).message}`);
          }
        }
        
        // Get current embedding model configuration
        const currentModel = this.plugin.settings.rag.embeddings.model;
        const currentDimensions = this.plugin.settings.rag.embeddings.dimensions;
        const currentMaxTokens = this.plugin.settings.rag.embeddings.maxTokens;
        
        const cacheInfo = `🧮 COMPREHENSIVE EMBEDDING CACHE ANALYSIS

💾 **MEMORY CACHE (RAM):**
• Size: ${stats.memory.size} embeddings loaded
• Models: ${stats.memory.models.join(', ') || 'None cached yet'}
• Status: ${stats.memory.size > 0 ? '✅ Active (fast access)' : '⚪ Empty (cold start)'}
• Memory Usage: ~${Math.round((stats.memory.size * 768 * 4) / 1024)} KB estimated

💿 **PERSISTENT CACHE (Disk):**
${stats.persistent ? `• Total Embeddings: ${stats.persistent.totalEmbeddings} stored permanently
• Cache File Size: ${stats.persistent.cacheSize}
• Model Distribution: ${Object.entries(stats.persistent.modelCounts).map(([model, count]) => `${model} (${count})`).join(', ') || 'None'}
• Creation Date: ${stats.persistent.oldestEmbedding?.toLocaleDateString() || 'N/A'}
• Last Updated: ${stats.persistent.newestEmbedding?.toLocaleDateString() || 'N/A'}
• Cache Hit Ratio: ${cacheHitRatio.toFixed(1)}% of vault (${stats.persistent.totalEmbeddings}/${vaultFileCount} files)
${validationResults ? `• Cache Validation: ${validationResults.validEntries} valid, ${validationResults.staleEntries} stale entries
• Missing Files: ${validationResults.missingFiles.length} cached files no longer exist
• Outdated Files: ${validationResults.outdatedEntries.length} files modified since caching` : '• Cache Validation: Not performed'}
• Status: ✅ Persistent storage active & auto-saving` : '❌ Not initialized - embeddings won\'t persist across restarts!'}

📊 **VAULT COVERAGE:**
• Total Vault Files: ${vaultFileCount} markdown files
• Files with Cached Embeddings: ${stats.persistent?.totalEmbeddings || 0}
• Coverage: ${cacheHitRatio.toFixed(1)}%
• Uncached Files: ${Math.max(0, vaultFileCount - (stats.persistent?.totalEmbeddings || 0))}

⚙️ **CURRENT CONFIGURATION:**
• Active Model: **${currentModel}** ${availableModels.find(m => m.name === currentModel) ? '✅' : '❌ Not available!'}
• Dimensions: ${currentDimensions || 'Auto-detect'} ${currentDimensions ? '(manual)' : '(from model)'}
• Max Tokens: ${currentMaxTokens || 'Auto-detect'} ${currentMaxTokens ? '(manual)' : '(from model)'}
• Auto-save: Every 5 minutes + on plugin unload

🔧 **ALL AVAILABLE MODELS:**
${availableModels.map(model => {
  const isActive = model.name === currentModel;
  const status = isActive ? '🎯 ACTIVE' : '⚪ Available';
  return `• ${status} **${model.name}** (${model.dimensions}D, ${model.isLocal ? '🏠 Local Ollama' : '☁️ Cloud API'}, ${model.maxTokens} max tokens)`;
}).join('\n')}

🚀 **PERFORMANCE INSIGHTS:**
• Cache Hit: ${stats.memory.size > 0 || (stats.persistent?.totalEmbeddings || 0) > 0 ? 'Instant loading for cached files' : 'No cache - all embeddings computed from scratch'}
• Restart Persistence: ${stats.persistent ? 'Cache survives Obsidian restarts' : 'Cache lost on restart - enable persistent storage!'}
• Model Changes: Changing embedding model invalidates cache (requires re-computation)
• File Updates: Modified files automatically invalidate their cached embeddings

⚡ **OPTIMIZATION TIPS:**
${cacheHitRatio < 50 ? '• Run semantic search to build comprehensive cache coverage' : ''}
${validationResults && validationResults.staleEntries > 10 ? '• Consider cleaning cache to remove stale entries' : ''}
${validationResults && validationResults.missingFiles.length > 0 ? `• ${validationResults.missingFiles.length} cached files no longer exist - auto-cleanup recommended` : ''}
${validationResults && validationResults.outdatedEntries.length > 5 ? `• ${validationResults.outdatedEntries.length} files modified since caching - will auto-update on next search` : ''}
${!stats.persistent ? '• Enable persistent storage for faster plugin restarts' : ''}
${availableModels.find(m => m.name === currentModel) ? '' : '• Current model not available - check Ollama connection'}

📈 **NEXT ACTIONS:**
• Click "Semantic Search" to analyze more files and build cache
• Cache automatically grows as you explore your vault
• No manual maintenance required - system handles cleanup`;

        messageInput.value = cacheInfo;
        
        this.logToConsole(consoleOutput, 'CACHE_SUCCESS', `Cache analysis: ${stats.memory.size} RAM + ${stats.persistent?.totalEmbeddings || 0} disk (${cacheHitRatio.toFixed(1)}% vault coverage)`);
        
      } catch (error) {
        this.logToConsole(consoleOutput, 'CACHE_ERROR', `Failed to get cache stats: ${(error as Error).message}`);
        messageInput.value = `🧮 EMBEDDING CACHE - ERROR\n\n${(error as Error).message}\n\n🔧 **Possible Issues:**\n• Embedding manager not fully initialized\n• Persistent storage path not accessible\n• Memory allocation issues\n\nSee console for technical details.`;
      }
    };

    clearConsole.onclick = () => {
      consoleOutput.empty();
      this.logToConsole(consoleOutput, 'CONSOLE', 'Console cleared');
    };

    exportLogs.onclick = () => {
      const logs = consoleOutput.textContent;
      navigator.clipboard.writeText(logs);
      this.logToConsole(consoleOutput, 'EXPORT', 'Console logs copied to clipboard');
    };

    // Advanced feature demo handlers
    fileOpsBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'FILE_OPS', 'Simulating file read operation...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'FILE_OPS', 'Reading: /vault/notes/important-note.md');
        this.logToConsole(consoleOutput, 'FILE_OPS', 'File size: 2.3KB | Last modified: 5 mins ago');
        this.logToConsole(consoleOutput, 'FILE_OPS', 'Content preview: "# Important Meeting Notes\\nDiscussed new features..."');
      }, 800);
    };

    settingsBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'SETTINGS', 'Loading plugin settings...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'SETTINGS', 'API Key: ••••••••••••5f2a (configured)');
        this.logToConsole(consoleOutput, 'SETTINGS', 'Model: claude-3-sonnet-20240229');
        this.logToConsole(consoleOutput, 'SETTINGS', 'Max tokens: 4000 | Temperature: 0.7');
        this.logToConsole(consoleOutput, 'SETTINGS', 'Wake word enabled: true | TTS voice: neural-en-US');
      }, 600);
    };

    workspaceBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'WORKSPACE', 'Analyzing workspace state...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'WORKSPACE', 'Active view: MarkdownView (editing mode)');
        this.logToConsole(consoleOutput, 'WORKSPACE', 'Open tabs: 3 | Split layout: vertical');
        this.logToConsole(consoleOutput, 'WORKSPACE', 'Current file: /Projects/Documentation.md');
        this.logToConsole(consoleOutput, 'WORKSPACE', 'Cursor position: line 47, column 23');
      }, 700);
    };

    vaultBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'VAULT', 'Scanning vault for recent files...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'VAULT', 'Total files: 1,247 | Folders: 23');
        this.logToConsole(consoleOutput, 'VAULT', 'Recent: AI_Research.md (2 mins ago)');
        this.logToConsole(consoleOutput, 'VAULT', 'Recent: Meeting_Notes.md (15 mins ago)');
        this.logToConsole(consoleOutput, 'VAULT', 'Recent: Project_Ideas.md (1 hour ago)');
        this.logToConsole(consoleOutput, 'VAULT', 'Most modified folder: /Daily_Notes (47 files)');
      }, 900);
    };

    aiBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Initializing AI processing pipeline...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Loading context from active note...');
        this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Context length: 2,847 tokens');
        this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Sending request to Claude API...');
        setTimeout(() => {
          this.logToConsole(consoleOutput, 'AI_SYSTEM', '✓ Response received (1.2s latency)');
          this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Response tokens: 312 | Usage: $0.0043');
          this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Confidence: 94% | Safety check: passed');
        }, 1200);
      }, 500);
    };

    memoryBtn.onclick = () => {
      this.logToConsole(consoleOutput, 'MEMORY', 'Collecting memory system statistics...');
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'MEMORY', 'Conversation history: 12 entries');
        this.logToConsole(consoleOutput, 'MEMORY', 'Context windows: 3 active | Memory usage: 847KB');
        this.logToConsole(consoleOutput, 'MEMORY', 'Embedding cache: 156 vectors | Last cleanup: 2h ago');
        this.logToConsole(consoleOutput, 'MEMORY', 'Performance: Avg response time 0.8s');
      }, 400);
    };

    // Real-time performance monitoring
    const startPerformanceMonitoring = () => {
      const cpuValueEl = container.querySelector('#cpu-value') as HTMLElement;
      const memValueEl = container.querySelector('#mem-value') as HTMLElement;
      const apiValueEl = container.querySelector('#api-value') as HTMLElement;
      const tokenValueEl = container.querySelector('#token-value') as HTMLElement;

      if (cpuValueEl && memValueEl && apiValueEl && tokenValueEl) {
        setInterval(() => {
          // Simulate realistic metrics with some variation
          const cpu = (15 + Math.random() * 30).toFixed(0) + '%';
          const memory = (800 + Math.random() * 200).toFixed(0) + 'MB';
          const latency = (0.5 + Math.random() * 0.8).toFixed(1) + 's';
          const tokens = (30 + Math.random() * 25).toFixed(0) + '/min';

          cpuValueEl.textContent = cpu;
          memValueEl.textContent = memory;
          apiValueEl.textContent = latency;
          tokenValueEl.textContent = tokens;
        }, 2000);
      }
    };

    // Initialize with sample conversation
    setTimeout(() => {
      this.addChatMessage(messagesContainer, 'Welcome to the Clippy AI Developer Panel! This showcases professional chat interface patterns.', 'ai', devPanelState);
      this.logToConsole(consoleOutput, 'SYSTEM', 'Developer panel initialized');
      this.logToConsole(consoleOutput, 'INFO', 'Ready for chat interactions');
      this.logToConsole(consoleOutput, 'PERF', 'Performance monitoring started');
      startPerformanceMonitoring();
    }, 500);

    // Handle Enter key in textarea
    messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendBtn.click();
      }
    });
  }

  // Chart drawing methods
  private chartData = {
    pieData: [
      { label: 'JavaScript', value: 35, color: '#f7df1e' },
      { label: 'TypeScript', value: 28, color: '#3178c6' },
      { label: 'Python', value: 22, color: '#3776ab' },
      { label: 'React', value: 15, color: '#61dafb' }
    ],
    barData: [
      { label: 'Q1', value: 120, color: '#ff6b6b' },
      { label: 'Q2', value: 150, color: '#4ecdc4' },
      { label: 'Q3', value: 180, color: '#45b7d1' },
      { label: 'Q4', value: 200, color: '#96ceb4' }
    ],
    lineData: [
      { x: 0, y: 50 }, { x: 1, y: 75 }, { x: 2, y: 60 }, { x: 3, y: 90 },
      { x: 4, y: 85 }, { x: 5, y: 110 }, { x: 6, y: 130 }, { x: 7, y: 120 }
    ]
  };

  private currentColorScheme = 0;
  private colorSchemes = [
    ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3'],
    ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'],
    ['#ff7675', '#fd79a8', '#fdcb6e', '#6c5ce7', '#74b9ff', '#00cec9']
  ];

  // Radial chart data and themes
  private radialData = {
    monthlyData: [
      { month: 'Jan', series1: 500, series2: 300 },
      { month: 'Feb', series1: 450, series2: 380 },
      { month: 'Mar', series1: 600, series2: 420 },
      { month: 'Apr', series1: 380, series2: 460 },
      { month: 'May', series1: 520, series2: 380 },
      { month: 'Jun', series1: 480, series2: 350 },
      { month: 'Jul', series1: 650, series2: 400 },
      { month: 'Aug', series1: 580, series2: 450 },
      { month: 'Sep', series1: 420, series2: 380 },
      { month: 'Oct', series1: 550, series2: 500 },
      { month: 'Nov', series1: 480, series2: 420 },
      { month: 'Dec', series1: 700, series2: 550 }
    ],
    categories: [
      { name: 'Development', value: 85, color: '#4ecdc4' },
      { name: 'Design', value: 70, color: '#45b7d1' },
      { name: 'Marketing', value: 60, color: '#96ceb4' },
      { name: 'Sales', value: 90, color: '#feca57' }
    ],
    hierarchicalData: [
      { name: 'Technology', value: 40, children: [
        { name: 'Web', value: 20 }, { name: 'Mobile', value: 15 }, { name: 'AI', value: 5 }
      ]},
      { name: 'Business', value: 35, children: [
        { name: 'Marketing', value: 15 }, { name: 'Sales', value: 20 }
      ]},
      { name: 'Design', value: 25, children: [
        { name: 'UI/UX', value: 15 }, { name: 'Graphics', value: 10 }
      ]}
    ]
  };

  private currentRadialTheme = 0;
  private radialThemes = [
    {
      name: 'Ocean',
      colors: ['#0077be', '#00a8cc', '#7dd3fc', '#bfdbfe', '#dbeafe'],
      grid: '#e0f2fe',
      text: '#0c4a6e'
    },
    {
      name: 'Sunset',
      colors: ['#f97316', '#ea580c', '#fb923c', '#fed7aa', '#fef3c7'],
      grid: '#fef3c7',
      text: '#9a3412'
    },
    {
      name: 'Forest',
      colors: ['#166534', '#16a34a', '#4ade80', '#bbf7d0', '#dcfce7'],
      grid: '#dcfce7',
      text: '#14532d'
    },
    {
      name: 'Purple',
      colors: ['#7c3aed', '#8b5cf6', '#a78bfa', '#c4b5fd', '#e9d5ff'],
      grid: '#f3e8ff',
      text: '#581c87'
    }
  ];

  private drawPieChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 80;
    
    let currentAngle = -Math.PI / 2;
    const total = this.chartData.pieData.reduce((sum, item) => sum + item.value, 0);
    
    // Draw pie slices
    this.chartData.pieData.forEach((item, index) => {
      const sliceAngle = (item.value / total) * 2 * Math.PI;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.lineTo(centerX, centerY);
      ctx.fillStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.fill();
      ctx.stroke();
      
      // Draw labels
      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius + 20);
      const labelY = centerY + Math.sin(labelAngle) * (radius + 20);
      
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${item.label}\n${item.value}%`, labelX, labelY);
      
      currentAngle += sliceAngle;
    });
  }

  private drawBarChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const barWidth = chartWidth / this.chartData.barData.length - 10;
    const maxValue = Math.max(...this.chartData.barData.map(d => d.value));

    // Draw bars
    this.chartData.barData.forEach((item, index) => {
      const barHeight = (item.value / maxValue) * chartHeight;
      const x = padding + index * (barWidth + 10);
      const y = canvas.height - padding - barHeight;

      ctx.fillStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.fillRect(x, y, barWidth, barHeight);
      
      // Draw labels
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + barWidth / 2, canvas.height - padding + 15);
      ctx.fillText(item.value.toString(), x + barWidth / 2, y - 5);
    });

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
  }

  private drawLineChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxY = Math.max(...this.chartData.lineData.map(d => d.y));
    const maxX = Math.max(...this.chartData.lineData.map(d => d.x));

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][0];
    ctx.lineWidth = 3;
    
    this.chartData.lineData.forEach((point, index) => {
      const x = padding + (point.x / maxX) * chartWidth;
      const y = canvas.height - padding - (point.y / maxY) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();

    // Draw points
    this.chartData.lineData.forEach((point) => {
      const x = padding + (point.x / maxX) * chartWidth;
      const y = canvas.height - padding - (point.y / maxY) * chartHeight;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = this.colorSchemes[this.currentColorScheme][1];
      ctx.fill();
    });

    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
  }

  private drawAreaChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const maxY = Math.max(...this.chartData.lineData.map(d => d.y));
    const maxX = Math.max(...this.chartData.lineData.map(d => d.x));

    // Draw filled area
    ctx.beginPath();
    ctx.moveTo(padding, canvas.height - padding);
    
    this.chartData.lineData.forEach((point) => {
      const x = padding + (point.x / maxX) * chartWidth;
      const y = canvas.height - padding - (point.y / maxY) * chartHeight;
      ctx.lineTo(x, y);
    });
    
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.closePath();
    
    const gradient = ctx.createLinearGradient(0, padding, 0, canvas.height - padding);
    gradient.addColorStop(0, this.colorSchemes[this.currentColorScheme][0] + '80');
    gradient.addColorStop(1, this.colorSchemes[this.currentColorScheme][0] + '20');
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line on top
    ctx.beginPath();
    ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][0];
    ctx.lineWidth = 2;
    
    this.chartData.lineData.forEach((point, index) => {
      const x = padding + (point.x / maxX) * chartWidth;
      const y = canvas.height - padding - (point.y / maxY) * chartHeight;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.stroke();
  }

  private drawRadialChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 100;
    const segments = this.chartData.pieData.length;
    
    // Draw radial segments
    this.chartData.pieData.forEach((item, index) => {
      const angle = (index * 2 * Math.PI) / segments;
      const radius = (item.value / 100) * maxRadius;
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, angle, angle + (2 * Math.PI) / segments);
      ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.lineWidth = 8;
      ctx.stroke();
      
      // Draw labels
      const labelRadius = radius + 15;
      const labelX = centerX + Math.cos(angle + Math.PI / segments) * labelRadius;
      const labelY = centerY + Math.sin(angle + Math.PI / segments) * labelRadius;
      
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, labelX, labelY);
    });
    
    // Draw center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    ctx.fillStyle = '#333';
    ctx.fill();
  }

  private drawColumnChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    const columnWidth = 20;
    const maxValue = Math.max(...this.chartData.barData.map(d => d.value));
    const spacing = chartWidth / this.chartData.barData.length;

    this.chartData.barData.forEach((item, index) => {
      const columnHeight = (item.value / maxValue) * chartHeight;
      const x = padding + index * spacing + (spacing - columnWidth) / 2;
      const y = canvas.height - padding - columnHeight;

      // Draw column with gradient
      const gradient = ctx.createLinearGradient(x, y, x, y + columnHeight);
      gradient.addColorStop(0, this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length]);
      gradient.addColorStop(1, this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length] + '60');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, columnWidth, columnHeight);
      
      // Add border
      ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.strokeRect(x, y, columnWidth, columnHeight);
      
      // Labels
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.label, x + columnWidth / 2, canvas.height - padding + 15);
      ctx.fillText(item.value.toString(), x + columnWidth / 2, y - 5);
    });
  }

  private drawTriangleChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const size = 80;
    
    // Draw triangular sections
    const angles = [0, 2 * Math.PI / 3, 4 * Math.PI / 3];
    
    angles.forEach((angle, index) => {
      const value = this.chartData.pieData[index]?.value || 0;
      const triangleSize = (value / 100) * size;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * triangleSize,
        centerY + Math.sin(angle) * triangleSize
      );
      ctx.lineTo(
        centerX + Math.cos(angle + 2 * Math.PI / 3) * triangleSize,
        centerY + Math.sin(angle + 2 * Math.PI / 3) * triangleSize
      );
      ctx.closePath();
      
      ctx.fillStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length] + '80';
      ctx.fill();
      ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.stroke();
      
      // Labels
      const labelX = centerX + Math.cos(angle + Math.PI / 3) * (triangleSize + 20);
      const labelY = centerY + Math.sin(angle + Math.PI / 3) * (triangleSize + 20);
      
      ctx.fillStyle = '#333';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      if (this.chartData.pieData[index]) {
        ctx.fillText(this.chartData.pieData[index].label, labelX, labelY);
      }
    });
  }

  private drawBubbleChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const padding = 40;
    const chartWidth = canvas.width - padding * 2;
    const chartHeight = canvas.height - padding * 2;
    
    const bubbleData = [
      { x: 30, y: 40, size: 20, label: 'A' },
      { x: 70, y: 80, size: 35, label: 'B' },
      { x: 50, y: 60, size: 15, label: 'C' },
      { x: 80, y: 30, size: 25, label: 'D' },
      { x: 20, y: 70, size: 30, label: 'E' }
    ];
    
    bubbleData.forEach((bubble, index) => {
      const x = padding + (bubble.x / 100) * chartWidth;
      const y = canvas.height - padding - (bubble.y / 100) * chartHeight;
      const radius = bubble.size;
      
      // Draw bubble with gradient
      const gradient = ctx.createRadialGradient(x - 5, y - 5, 0, x, y, radius);
      gradient.addColorStop(0, this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length] + '80');
      gradient.addColorStop(1, this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length] + '40');
      
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = this.colorSchemes[this.currentColorScheme][index % this.colorSchemes[this.currentColorScheme].length];
      ctx.stroke();
      
      // Label
      ctx.fillStyle = '#333';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(bubble.label, x, y + 4);
    });
    
    // Draw axes
    ctx.strokeStyle = '#333';
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, canvas.height - padding);
    ctx.lineTo(canvas.width - padding, canvas.height - padding);
    ctx.stroke();
  }

  // Radial Chart Drawing Methods
  
  private drawRadialLineChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 40;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    // Draw grid circles
    for (let i = 1; i <= 4; i++) {
      const radius = (maxRadius / 4) * i;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw radial grid lines
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle - Math.PI / 2) * maxRadius,
        centerY + Math.sin(angle - Math.PI / 2) * maxRadius
      );
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }
    
    // Draw month labels
    this.radialData.monthlyData.forEach((data, index) => {
      const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
      const labelRadius = maxRadius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      
      ctx.fillStyle = theme.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(data.month, x, y);
    });
    
    // Draw value scale
    for (let i = 200; i <= 800; i += 200) {
      const radius = (i / 800) * maxRadius;
      ctx.fillStyle = theme.text;
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(i.toString(), centerX, centerY - radius - 5);
    }
    
    // Draw series 1 (outer line)
    ctx.beginPath();
    this.radialData.monthlyData.forEach((data, index) => {
      const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
      const radius = (data.series1 / 800) * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = theme.colors[0];
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw series 1 points
    this.radialData.monthlyData.forEach((data, index) => {
      const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
      const radius = (data.series1 / 800) * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = theme.colors[0];
      ctx.fill();
    });
    
    // Draw series 2 (inner line)
    ctx.beginPath();
    this.radialData.monthlyData.forEach((data, index) => {
      const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
      const radius = (data.series2 / 800) * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.strokeStyle = theme.colors[2];
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Draw series 2 points
    this.radialData.monthlyData.forEach((data, index) => {
      const angle = (index * Math.PI * 2) / 12 - Math.PI / 2;
      const radius = (data.series2 / 800) * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fillStyle = theme.colors[2];
      ctx.fill();
    });

    // Legend
    ctx.fillStyle = theme.colors[0];
    ctx.fillRect(20, 20, 15, 3);
    ctx.fillStyle = theme.text;
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'start';
    ctx.fillText('Series 1', 40, 25);
    
    ctx.fillStyle = theme.colors[2];
    ctx.fillRect(20, 40, 15, 3);
    ctx.fillStyle = theme.text;
    ctx.fillText('Series 2', 40, 45);
  }

  private drawConcentricRingChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 40;
    const theme = this.radialThemes[this.currentRadialTheme];
    const ringWidth = 25;
    
    // Draw grid lines (angle markers)
    for (let i = 0; i < 16; i++) {
      const angle = (i * Math.PI * 2) / 16;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 0.5;
      ctx.stroke();
      
      // Number labels
      if (i < 16) {
        const labelRadius = maxRadius + 15;
        const x = centerX + Math.cos(angle) * labelRadius;
        const y = centerY + Math.sin(angle) * labelRadius;
        ctx.fillStyle = theme.text;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(i.toString(), x, y);
      }
    }
    
    // Draw concentric rings for each category
    this.radialData.categories.forEach((category, categoryIndex) => {
      const innerRadius = 30 + categoryIndex * (ringWidth + 5);
      const outerRadius = innerRadius + ringWidth;
      
      // Draw category ring segments
      for (let i = 0; i < 16; i++) {
        const startAngle = (i * Math.PI * 2) / 16;
        const endAngle = ((i + 1) * Math.PI * 2) / 16;
        const value = Math.random() * category.value + 10; // Simulate data
        const segmentRadius = innerRadius + (value / 100) * ringWidth;
        
        if (segmentRadius > innerRadius) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, segmentRadius, startAngle, endAngle);
          ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
          ctx.closePath();
          
          // Gradient fill
          const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, segmentRadius);
          gradient.addColorStop(0, theme.colors[categoryIndex] + '80');
          gradient.addColorStop(1, theme.colors[categoryIndex]);
          ctx.fillStyle = gradient;
          ctx.fill();
        }
      }
      
      // Category label
      const labelAngle = Math.PI / 4;
      const labelRadius = innerRadius + ringWidth / 2;
      const x = centerX + Math.cos(labelAngle) * (maxRadius + 30);
      const y = centerY + Math.sin(labelAngle) * (maxRadius + 30) + categoryIndex * 20;
      
      ctx.fillStyle = theme.colors[categoryIndex];
      ctx.fillRect(x - 40, y - 8, 12, 12);
      ctx.fillStyle = theme.text;
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'start';
      ctx.fillText(category.name, x - 25, y);
    });
    
    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[0];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawRadialSegmentChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 60;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    let currentAngle = -Math.PI / 2;
    
    // Draw outer ring (main categories)
    this.radialData.hierarchicalData.forEach((category, categoryIndex) => {
      const categoryAngle = (category.value / 100) * 2 * Math.PI;
      
      // Outer segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, currentAngle, currentAngle + categoryAngle);
      ctx.arc(centerX, centerY, maxRadius - 40, currentAngle + categoryAngle, currentAngle, true);
      ctx.closePath();
      
      const gradient = ctx.createRadialGradient(centerX, centerY, maxRadius - 40, centerX, centerY, maxRadius);
      gradient.addColorStop(0, theme.colors[categoryIndex] + '60');
      gradient.addColorStop(1, theme.colors[categoryIndex]);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Category label
      const labelAngle = currentAngle + categoryAngle / 2;
      const labelRadius = maxRadius - 20;
      const x = centerX + Math.cos(labelAngle) * labelRadius;
      const y = centerY + Math.sin(labelAngle) * labelRadius;
      
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(labelAngle + Math.PI / 2);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(category.name, 0, 0);
      ctx.restore();
      
      // Inner segments (subcategories)
      let subAngle = currentAngle;
      category.children.forEach((child, childIndex) => {
        const childAngleSize = (child.value / category.value) * categoryAngle;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius - 45, subAngle, subAngle + childAngleSize);
        ctx.arc(centerX, centerY, maxRadius - 85, subAngle + childAngleSize, subAngle, true);
        ctx.closePath();
        
        ctx.fillStyle = theme.colors[categoryIndex + 1] || theme.colors[0];
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // Child label
        if (childAngleSize > 0.3) { // Only show label if segment is large enough
          const childLabelAngle = subAngle + childAngleSize / 2;
          const childLabelRadius = maxRadius - 65;
          const childX = centerX + Math.cos(childLabelAngle) * childLabelRadius;
          const childY = centerY + Math.sin(childLabelAngle) * childLabelRadius;
          
          ctx.fillStyle = '#fff';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(child.name, childX, childY);
        }
        
        subAngle += childAngleSize;
      });
      
      currentAngle += categoryAngle;
    });
    
    // Center circle with title
    ctx.beginPath();
    ctx.arc(centerX, centerY, maxRadius - 85, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[0];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Data', centerX, centerY - 5);
    ctx.fillText('Overview', centerX, centerY + 10);
  }

  private drawProgressRingChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    const rings = [
      { label: 'Tasks', progress: 0.75, radius: 100, width: 12 },
      { label: 'Projects', progress: 0.60, radius: 80, width: 10 },
      { label: 'Goals', progress: 0.85, radius: 60, width: 8 },
      { label: 'KPIs', progress: 0.45, radius: 40, width: 6 }
    ];
    
    rings.forEach((ring, index) => {
      // Background ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.radius, 0, 2 * Math.PI);
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = ring.width;
      ctx.stroke();
      
      // Progress arc
      const endAngle = -Math.PI / 2 + (ring.progress * 2 * Math.PI);
      ctx.beginPath();
      ctx.arc(centerX, centerY, ring.radius, -Math.PI / 2, endAngle);
      ctx.strokeStyle = theme.colors[index];
      ctx.lineWidth = ring.width;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Progress text
      ctx.fillStyle = theme.text;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(ring.progress * 100)}%`, 
        centerX + Math.cos(endAngle) * (ring.radius + 20),
        centerY + Math.sin(endAngle) * (ring.radius + 20)
      );
      
      // Label
      ctx.font = '10px sans-serif';
      ctx.fillText(ring.label, 
        centerX + ring.radius + 30,
        centerY - ring.radius / 2 + index * 15
      );
    });
    
    // Center text
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Progress', centerX, centerY - 5);
    ctx.font = '12px sans-serif';
    ctx.fillText('Dashboard', centerX, centerY + 10);
  }

  private drawRadarChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 50;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    const axes = ['Speed', 'Quality', 'Cost', 'Innovation', 'Reliability', 'Usability'];
    const data1 = [0.8, 0.6, 0.9, 0.7, 0.85, 0.75];
    const data2 = [0.6, 0.9, 0.7, 0.85, 0.6, 0.8];
    
    // Draw grid
    for (let i = 1; i <= 5; i++) {
      ctx.beginPath();
      const radius = (maxRadius / 5) * i;
      
      axes.forEach((_, index) => {
        const angle = (index * Math.PI * 2) / axes.length - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      
      ctx.closePath();
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    
    // Draw axes
    axes.forEach((axis, index) => {
      const angle = (index * Math.PI * 2) / axes.length - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * maxRadius,
        centerY + Math.sin(angle) * maxRadius
      );
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.stroke();
      
      // Axis labels
      const labelRadius = maxRadius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      
      ctx.fillStyle = theme.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(axis, x, y);
    });
    
    // Draw data series 1
    ctx.beginPath();
    data1.forEach((value, index) => {
      const angle = (index * Math.PI * 2) / data1.length - Math.PI / 2;
      const radius = value * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = theme.colors[0] + '40';
    ctx.fill();
    ctx.strokeStyle = theme.colors[0];
    ctx.lineWidth = 2;
    ctx.stroke();
    
    // Draw data series 2
    ctx.beginPath();
    data2.forEach((value, index) => {
      const angle = (index * Math.PI * 2) / data2.length - Math.PI / 2;
      const radius = value * maxRadius;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    ctx.closePath();
    ctx.fillStyle = theme.colors[2] + '40';
    ctx.fill();
    ctx.strokeStyle = theme.colors[2];
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private drawSunburstChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    let currentAngle = 0;
    const innerRadius = 30;
    const middleRadius = 80;
    const outerRadius = 120;
    
    this.radialData.hierarchicalData.forEach((category, categoryIndex) => {
      const categoryAngle = (category.value / 100) * 2 * Math.PI;
      
      // Inner ring (main category)
      ctx.beginPath();
      ctx.arc(centerX, centerY, middleRadius, currentAngle, currentAngle + categoryAngle);
      ctx.arc(centerX, centerY, innerRadius, currentAngle + categoryAngle, currentAngle, true);
      ctx.closePath();
      ctx.fillStyle = theme.colors[categoryIndex];
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Outer ring (subcategories)
      let subAngle = currentAngle;
      category.children.forEach((child, childIndex) => {
        const childAngle = (child.value / category.value) * categoryAngle;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius, subAngle, subAngle + childAngle);
        ctx.arc(centerX, centerY, middleRadius, subAngle + childAngle, subAngle, true);
        ctx.closePath();
        
        const gradient = ctx.createRadialGradient(centerX, centerY, middleRadius, centerX, centerY, outerRadius);
        gradient.addColorStop(0, theme.colors[categoryIndex]);
        gradient.addColorStop(1, theme.colors[categoryIndex] + '80');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        subAngle += childAngle;
      });
      
      currentAngle += categoryAngle;
    });
    
    // Center circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[0];
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('ROOT', centerX, centerY);
  }

  private drawClockChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 40;
    const theme = this.radialThemes[this.currentRadialTheme];
    
    // Clock face
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[4];
    ctx.fill();
    ctx.strokeStyle = theme.colors[0];
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Hour markers with data
    const hourData = [65, 45, 30, 20, 25, 40, 55, 70, 80, 75, 60, 50];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12 - Math.PI / 2;
      const dataValue = hourData[i];
      const dataRadius = (dataValue / 100) * (radius - 20);
      
      // Hour marker
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * (radius - 10),
        centerY + Math.sin(angle) * (radius - 10)
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * (radius - 20),
        centerY + Math.sin(angle) * (radius - 20)
      );
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Data bar
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * dataRadius,
        centerY + Math.sin(angle) * dataRadius
      );
      ctx.strokeStyle = theme.colors[1];
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.stroke();
      
      // Hour number
      const numX = centerX + Math.cos(angle) * (radius - 35);
      const numY = centerY + Math.sin(angle) * (radius - 35);
      ctx.fillStyle = theme.text;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((i === 0 ? 12 : i).toString(), numX, numY + 5);
    }
    
    // Center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[0];
    ctx.fill();
  }

  private drawGaugeChart(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 40;
    const radius = Math.min(centerX, centerY) - 40;
    const theme = this.radialThemes[this.currentRadialTheme];
    const startAngle = Math.PI;
    const endAngle = 2 * Math.PI;
    const value = 75; // Current value (0-100)
    
    // Background arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.strokeStyle = theme.grid;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Value arc
    const valueAngle = startAngle + (value / 100) * (endAngle - startAngle);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, valueAngle);
    
    // Gradient for the gauge
    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, theme.colors[2]);
    gradient.addColorStop(0.5, theme.colors[1]);
    gradient.addColorStop(1, theme.colors[0]);
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Scale markers
    for (let i = 0; i <= 10; i++) {
      const angle = startAngle + (i / 10) * (endAngle - startAngle);
      const innerRadius = radius - 35;
      const outerRadius = radius - 15;
      
      ctx.beginPath();
      ctx.moveTo(
        centerX + Math.cos(angle) * innerRadius,
        centerY + Math.sin(angle) * innerRadius
      );
      ctx.lineTo(
        centerX + Math.cos(angle) * outerRadius,
        centerY + Math.sin(angle) * outerRadius
      );
      ctx.strokeStyle = theme.text;
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Scale numbers
      const labelRadius = radius - 45;
      const labelX = centerX + Math.cos(angle) * labelRadius;
      const labelY = centerY + Math.sin(angle) * labelRadius;
      
      ctx.fillStyle = theme.text;
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((i * 10).toString(), labelX, labelY);
    }
    
    // Center value display
    ctx.fillStyle = theme.text;
    ctx.font = 'bold 32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(value.toString(), centerX, centerY - 10);
    
    ctx.font = '14px sans-serif';
    ctx.fillText('Performance Score', centerX, centerY + 15);
    
    // Needle
    const needleAngle = startAngle + (value / 100) * (endAngle - startAngle);
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(
      centerX + Math.cos(needleAngle) * (radius - 30),
      centerY + Math.sin(needleAngle) * (radius - 30)
    );
    ctx.strokeStyle = theme.colors[0];
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, 2 * Math.PI);
    ctx.fillStyle = theme.colors[0];
    ctx.fill();
  }

  // Developer Panel Helper Methods
  
  private addChatMessage(container: HTMLElement, message: string, sender: 'user' | 'ai', state: any, thinking?: string): void {
    const messageDiv = container.createDiv(`chat-message ${sender}-message ${state.colorScheme}-scheme`);
    
    // Message header with icon and timestamp
    const messageHeader = messageDiv.createDiv('message-header');
    const icon = messageHeader.createEl('span', { cls: 'message-icon' });
    icon.textContent = sender === 'user' ? '👤' : '🤖';
    
    const senderLabel = messageHeader.createEl('span', { cls: 'sender-label' });
    senderLabel.textContent = sender === 'user' ? 'You' : 'Clippy AI';
    
    const timestamp = messageHeader.createEl('span', { cls: 'timestamp' });
    timestamp.textContent = new Date().toLocaleTimeString();
    
    // Thinking section (only for AI messages)
    if (thinking && sender === 'ai') {
      const thinkingDiv = messageDiv.createDiv(`thinking-section ${state.showThinking ? '' : 'hidden'}`);
      const thinkingHeader = thinkingDiv.createDiv('thinking-header');
      thinkingHeader.createEl('span', { text: '🧠 Thinking Process' });
      
      const thinkingToggle = thinkingHeader.createEl('button', { 
        text: state.showThinking ? '▼' : '▶', 
        cls: 'thinking-toggle-btn' 
      });
      
      const thinkingContent = thinkingDiv.createDiv('thinking-content');
      thinkingContent.textContent = thinking;
      
      thinkingToggle.onclick = () => {
        const isVisible = !thinkingContent.hasClass('hidden');
        thinkingContent.toggleClass('hidden', isVisible);
        thinkingToggle.textContent = isVisible ? '▶' : '▼';
      };
    }
    
    // Main message content
    const messageContent = messageDiv.createDiv('message-content');
    
    // Format message with markdown-like styling
    const formattedMessage = message
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•\s/g, '<span class="bullet">•</span> ')
      .replace(/\n/g, '<br>');
    
    messageContent.innerHTML = formattedMessage;
    
    // Scroll to bottom
    container.scrollTop = container.scrollHeight;
    
    // Add typing animation for AI messages
    if (sender === 'ai') {
      messageContent.addClass('typing');
      setTimeout(() => messageContent.removeClass('typing'), 1000);
    }
  }

  private updateChatColorScheme(container: HTMLElement, scheme: string): void {
    const messages = container.querySelectorAll('.chat-message');
    messages.forEach(message => {
      // Remove old scheme classes
      message.removeClass('default-scheme', 'ocean-scheme', 'sunset-scheme', 'forest-scheme', 'cyberpunk-scheme', 'monochrome-scheme');
      message.addClass(`${scheme}-scheme`);
    });
  }

  private toggleThinkingVisibility(container: HTMLElement, show: boolean): void {
    const thinkingSections = container.querySelectorAll('.thinking-section');
    thinkingSections.forEach(section => {
      section.toggleClass('hidden', !show);
    });
  }

  private logToConsole(consoleOutput: HTMLElement, type: string, message: string): void {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = consoleOutput.createDiv(`console-entry ${type.toLowerCase()}-log`);
    
    const timeSpan = logEntry.createEl('span', { cls: 'log-time' });
    timeSpan.textContent = `[${timestamp}]`;
    
    const typeSpan = logEntry.createEl('span', { cls: 'log-type' });
    typeSpan.textContent = `[${type}]`;
    
    const messageSpan = logEntry.createEl('span', { cls: 'log-message' });
    messageSpan.textContent = message;
    
    // Auto-scroll console
    consoleOutput.scrollTop = consoleOutput.scrollHeight;
    
    // Limit console entries to prevent memory issues
    const entries = consoleOutput.querySelectorAll('.console-entry');
    if (entries.length > 100) {
      entries[0].remove();
    }
  }

  private simulateAudioVisualization(canvas: HTMLCanvasElement, type: string): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.003;
      
      ctx.strokeStyle = 'var(--interactive-accent)';
      ctx.fillStyle = 'var(--interactive-accent)';
      ctx.lineWidth = 2;
      
      switch (type) {
        case 'waveform':
          this.drawWaveform(ctx, canvas, time);
          break;
        case 'spectrum':
          this.drawSpectrum(ctx, canvas, time);
          break;
        case 'circular':
          this.drawCircularViz(ctx, centerX, centerY, time);
          break;
        case 'bars':
          this.drawBars(ctx, canvas, time);
          break;
        case 'particles':
          this.drawParticles(ctx, canvas, time);
          break;
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Stop animation after 3 seconds
    setTimeout(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    }, 3000);
  }

  private simulateTTSVisualization(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const time = Date.now() * 0.008; // Faster animation for speech
      
      // Simulate more dynamic intensity with higher sensitivity
      const baseIntensity = 0.2 + Math.sin(time * 2.5) * 0.4 + Math.sin(time * 4) * 0.2; // More variation, 0.0 to 0.8
      const sensitiveIntensity = Math.min(1, Math.max(0, baseIntensity)); // Clamp to 0-1
      
      // Fill to outer edge with more dramatic range
      const maxRadius = 28; // Same as real audio - fill to outer edge
      const minRadius = 3; // Same minimum as real audio
      const fillRadius = minRadius + (sensitiveIntensity * (maxRadius - minRadius));
      
      // Create gradient similar to real audio (but simulated)
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fillRadius);
      
      // Color transitions matching the real audio sensitivity ranges
      if (sensitiveIntensity < 0.2) {
        // Very low: Subtle blue glow (matches real audio)
        gradient.addColorStop(0, `rgba(59, 130, 246, ${sensitiveIntensity * 3})`);
        gradient.addColorStop(0.8, `rgba(139, 92, 246, ${sensitiveIntensity * 2})`);
        gradient.addColorStop(1, `rgba(59, 130, 246, ${sensitiveIntensity * 1.5})`);
      } else if (sensitiveIntensity < 0.5) {
        // Low-medium: Purple to Pink
        gradient.addColorStop(0, `rgba(139, 92, 246, ${sensitiveIntensity * 2.5})`);
        gradient.addColorStop(0.6, `rgba(236, 72, 153, ${sensitiveIntensity * 2})`);
        gradient.addColorStop(1, `rgba(139, 92, 246, ${sensitiveIntensity * 1.2})`);
      } else if (sensitiveIntensity < 0.8) {
        // Medium-high: Pink to Orange
        gradient.addColorStop(0, `rgba(236, 72, 153, ${sensitiveIntensity * 2})`);
        gradient.addColorStop(0.5, `rgba(249, 115, 22, ${sensitiveIntensity * 1.8})`);
        gradient.addColorStop(1, `rgba(236, 72, 153, ${sensitiveIntensity * 1})`);
      } else {
        // Very high: White hot center to red
        gradient.addColorStop(0, `rgba(255, 255, 255, ${sensitiveIntensity * 1.2})`);
        gradient.addColorStop(0.3, `rgba(249, 115, 22, ${sensitiveIntensity * 1.5})`);
        gradient.addColorStop(0.7, `rgba(239, 68, 68, ${sensitiveIntensity * 1.3})`);
        gradient.addColorStop(1, `rgba(239, 68, 68, ${sensitiveIntensity * 0.8})`);
      }
      
      // Fill with gradient
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
      ctx.fill();
      
      // More dramatic pulsing edge ring (matches real audio)
      ctx.strokeStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.9})`;
      ctx.lineWidth = 1.5 + (sensitiveIntensity * 2.5);
      ctx.beginPath();
      ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
      ctx.stroke();
      
      // Secondary pulsing ring for dramatic effect
      if (sensitiveIntensity > 0.3) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.4})`;
        ctx.lineWidth = 0.5 + (sensitiveIntensity * 1);
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
        ctx.stroke();
      }
      
      // More dramatic sparkles (matches real audio)
      if (sensitiveIntensity > 0.3) {
        const sparkleCount = Math.floor(sensitiveIntensity * 10);
        for (let i = 0; i < sparkleCount; i++) {
          const angle = (time * 0.8 + i) * Math.PI * 2 / sparkleCount;
          const sparkleRadius = fillRadius * (0.4 + Math.sin(time * 1.5 + i) * 0.3);
          const sparkleX = centerX + Math.cos(angle) * sparkleRadius;
          const sparkleY = centerY + Math.sin(angle) * sparkleRadius;
          
          ctx.fillStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.9})`;
          ctx.beginPath();
          ctx.arc(sparkleX, sparkleY, 0.8 + (sensitiveIntensity * 0.8), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    // Stop animation after 4 seconds (longer for TTS)
    setTimeout(() => {
      if (animationId) {
        cancelAnimationFrame(animationId);
        // Draw static inactive state
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        ctx.strokeStyle = 'var(--text-muted)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.stroke();
      }
    }, 4000);
  }

  private async generateAIResponse(
    userMessage: string, 
    messagesContainer: HTMLElement, 
    consoleOutput: HTMLElement, 
    devPanelState: any,
    audioVizCanvas: HTMLCanvasElement,
    ttsCanvas: HTMLCanvasElement
  ): Promise<void> {
    try {
      this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Connecting to AI provider...');
      
      // Get AI provider from plugin
      const aiProvider = await this.plugin.getAIProvider();
      if (!aiProvider) {
        this.logToConsole(consoleOutput, 'ERROR', 'No AI provider available');
        this.addChatMessage(messagesContainer, '❌ AI provider not available. Please check your settings.', 'ai', devPanelState);
        return;
      }

      this.logToConsole(consoleOutput, 'AI_SYSTEM', `Using ${aiProvider.constructor.name} provider`);
      this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Generating response...');

      // Create the API request with proper signature
      const prompt = `You are Clippy, an AI assistant integrated into Obsidian. You're currently showcasing your capabilities in the UI demo panel. Respond to this user message in a helpful and engaging way: "${userMessage}"`;
      const context = "This is a demonstration of Clippy's AI chat functionality in the UI showcase panel. Keep responses concise and engaging.";
      
      const responseContent = await aiProvider.generateResponse(prompt, context);

      // Add AI response to chat
      this.addChatMessage(messagesContainer, responseContent, 'ai', devPanelState);
      this.logToConsole(consoleOutput, 'AI_RESPONSE', `Generated response (${responseContent.length} chars)`);
      this.logToConsole(consoleOutput, 'AI_SYSTEM', 'Response generated successfully');
      
      devPanelState.messageCount++;
      
      // Trigger visualizations if TTS is enabled
      if (devPanelState.ttsEnabled) {
        this.simulateAudioVisualization(audioVizCanvas, devPanelState.currentViz);
        await this.speakWithRealTTS(responseContent, ttsCanvas, consoleOutput);
      }
    } catch (error) {
      console.error('AI Response Error:', error);
      this.logToConsole(consoleOutput, 'ERROR', `AI Error: ${error.message}`);
      this.addChatMessage(messagesContainer, `❌ Sorry, I encountered an error: ${error.message}`, 'ai', devPanelState);
    }
  }

  private async speakWithRealTTS(text: string, ttsCanvas: HTMLCanvasElement, consoleOutput: HTMLElement): Promise<void> {
    try {
      this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'Starting real TTS synthesis...');
      
      // Get the voice system from the plugin (exact same pattern as vault agent)
      const voiceSystem = this.plugin.voiceSystemV2;
      if (!voiceSystem) {
        this.logToConsole(consoleOutput, 'TTS_ERROR', 'Voice system not available, falling back to simulation');
        this.simulateTTSVisualization(ttsCanvas);
        return;
      }

      const ttsManager = voiceSystem.getTTSManager();
      if (ttsManager) {
        this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'Setting up real audio spectrum analysis');
        
        // Setup audio ready callback for real spectrum (copied from vault agent)
        (ttsManager as any).onAudioReady = (audio: HTMLAudioElement, filePath: string) => {
          this.logToConsole(consoleOutput, 'TTS_VISUAL', 'Real audio element received, creating spectrum analyzer');
          this.createRealAudioSpectrum(ttsCanvas, audio, consoleOutput);
        };
        
        // Start TTS with real audio (exact same call as vault agent)
        this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'Using TTS manager for speech with real audio');
        await ttsManager.speak(text);
      } else {
        this.logToConsole(consoleOutput, 'TTS_ERROR', 'TTS manager not available, using fallback simulation');
        this.simulateTTSVisualization(ttsCanvas);
      }

      // Clean up after estimated duration (copied from vault agent)
      const estimatedDuration = Math.max(3000, text.length * 50); // 50ms per character
      this.logToConsole(consoleOutput, 'TTS_SYSTEM', `Setting cleanup timer for ${estimatedDuration}ms`);
      setTimeout(() => {
        this.logToConsole(consoleOutput, 'TTS_SYSTEM', 'Cleaning up TTS visualization');
        this.drawInactiveState(ttsCanvas, ttsCanvas.getContext('2d')!);
      }, estimatedDuration);
      
    } catch (error) {
      console.error('Real TTS Error:', error);
      this.logToConsole(consoleOutput, 'TTS_ERROR', `TTS error: ${error.message}, falling back to simulation`);
      this.simulateTTSVisualization(ttsCanvas);
    }
  }


  private createRealAudioSpectrum(canvas: HTMLCanvasElement, audio: HTMLAudioElement, consoleOutput: HTMLElement): void {
    try {
      this.logToConsole(consoleOutput, 'TTS_VISUAL', 'Creating real audio spectrum for TTS');
      
      // Create audio context and analyzer (copied from vault agent)
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audio);
      
      // Configure analyzer for speech (same settings as vault agent)
      analyser.fftSize = 256;
      analyser.minDecibels = -90;
      analyser.maxDecibels = -10;
      analyser.smoothingTimeConstant = 0.85;
      
      // Connect audio graph
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      let animationId: number;
      
      const animate = () => {
        analyser.getByteFrequencyData(dataArray);
        
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Calculate average frequency for ring animation (real audio data!)
        const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
        const intensity = average / 255;
        
        // Make much more sensitive - react to even small audio changes
        const sensitiveIntensity = Math.min(1, intensity * 3.5); // Amplify sensitivity 3.5x
        
        if (intensity > 0.005) { // Lower threshold for more reactivity
          // Fill to the OUTER edge of the outer circle (full radius)
          const maxRadius = 28; // Fill to outer edge of the CSS border circle
          const minRadius = 3; // Smaller minimum for more dramatic range
          const fillRadius = minRadius + (sensitiveIntensity * (maxRadius - minRadius));
          
          // Create intensity-based gradient
          const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fillRadius);
          
          // Color transitions based on SENSITIVE intensity
          if (sensitiveIntensity < 0.2) {
            // Very low: Subtle blue glow
            gradient.addColorStop(0, `rgba(59, 130, 246, ${sensitiveIntensity * 3})`); // Bright blue center
            gradient.addColorStop(0.8, `rgba(139, 92, 246, ${sensitiveIntensity * 2})`); // Purple mid
            gradient.addColorStop(1, `rgba(59, 130, 246, ${sensitiveIntensity * 1.5})`); // Blue fade
          } else if (sensitiveIntensity < 0.5) {
            // Low-medium: Blue to Purple to Pink
            gradient.addColorStop(0, `rgba(139, 92, 246, ${sensitiveIntensity * 2.5})`); // Purple center
            gradient.addColorStop(0.6, `rgba(236, 72, 153, ${sensitiveIntensity * 2})`); // Pink mid  
            gradient.addColorStop(1, `rgba(139, 92, 246, ${sensitiveIntensity * 1.2})`); // Purple fade
          } else if (sensitiveIntensity < 0.8) {
            // Medium-high: Pink to Orange
            gradient.addColorStop(0, `rgba(236, 72, 153, ${sensitiveIntensity * 2})`); // Pink center
            gradient.addColorStop(0.5, `rgba(249, 115, 22, ${sensitiveIntensity * 1.8})`); // Orange mid
            gradient.addColorStop(1, `rgba(236, 72, 153, ${sensitiveIntensity * 1})`); // Pink fade
          } else {
            // Very high: Orange to Red with white center
            gradient.addColorStop(0, `rgba(255, 255, 255, ${sensitiveIntensity * 1.2})`); // White hot center
            gradient.addColorStop(0.3, `rgba(249, 115, 22, ${sensitiveIntensity * 1.5})`); // Orange 
            gradient.addColorStop(0.7, `rgba(239, 68, 68, ${sensitiveIntensity * 1.3})`); // Red
            gradient.addColorStop(1, `rgba(239, 68, 68, ${sensitiveIntensity * 0.8})`); // Red fade
          }
          
          // Fill the circular area with gradient
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
          ctx.fill();
          
          // More visible pulsing ring at the fill edge
          ctx.strokeStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.9})`;
          ctx.lineWidth = 1.5 + (sensitiveIntensity * 2.5); // Thicker, more visible ring
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Add secondary pulsing ring for more dramatic effect
          if (sensitiveIntensity > 0.3) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.4})`;
            ctx.lineWidth = 0.5 + (sensitiveIntensity * 1);
            ctx.beginPath();
            ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
            ctx.stroke();
          }
          
          // More responsive sparkle effects
          if (sensitiveIntensity > 0.3) { // Lower threshold
            const sparkleCount = Math.floor(sensitiveIntensity * 12); // More sparkles
            for (let i = 0; i < sparkleCount; i++) {
              const angle = (Date.now() * 0.002 + i) * Math.PI * 2 / sparkleCount; // Faster rotation
              const sparkleRadius = fillRadius * (0.4 + Math.sin(Date.now() * 0.003 + i) * 0.3); // Varying radius
              const sparkleX = centerX + Math.cos(angle) * sparkleRadius;
              const sparkleY = centerY + Math.sin(angle) * sparkleRadius;
              
              // Larger, more visible sparkles
              ctx.fillStyle = `rgba(255, 255, 255, ${sensitiveIntensity * 0.9})`;
              ctx.beginPath();
              ctx.arc(sparkleX, sparkleY, 0.8 + (sensitiveIntensity * 0.8), 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else {
          // Draw inactive state when no audio
          this.drawInactiveState(canvas, ctx);
        }
        
        animationId = requestAnimationFrame(animate);
      };
      
      // Handle audio events (copied from vault agent pattern)
      const handleAudioPlay = () => {
        this.logToConsole(consoleOutput, 'TTS_VISUAL', 'Real audio started playing');
        animate();
      };
      
      const handleAudioEnd = () => {
        this.logToConsole(consoleOutput, 'TTS_VISUAL', 'Real audio ended');
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        audioContext.close();
        this.drawInactiveState(canvas, ctx);
      };
      
      audio.addEventListener('play', handleAudioPlay);
      audio.addEventListener('ended', handleAudioEnd);
      audio.addEventListener('pause', handleAudioEnd);
      
      // Start immediately if audio is already playing
      if (!audio.paused && !audio.ended) {
        this.logToConsole(consoleOutput, 'TTS_VISUAL', 'Audio already playing, starting analysis immediately');
        animate();
      }
      
    } catch (error) {
      console.error('Real audio spectrum error:', error);
      this.logToConsole(consoleOutput, 'TTS_ERROR', 'Failed to create real audio spectrum, using simulation');
      this.simulateTTSVisualization(canvas);
    }
  }

  private drawInactiveState(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    
    ctx.strokeStyle = 'var(--text-muted)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
    ctx.stroke();
  }

  private stopCurrentSpeech(): void {
    try {
      const voiceSystem = this.plugin.voiceSystemV2;
      if (voiceSystem) {
        const ttsManager = voiceSystem.getTTSManager();
        if (ttsManager && typeof (ttsManager as any).stopSpeech === 'function') {
          (ttsManager as any).stopSpeech();
        }
      }
      
      // Also stop Web Speech API if it's being used
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  private drawWaveform(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number): void {
    ctx.beginPath();
    for (let x = 0; x < canvas.width; x += 2) {
      const frequency = 0.02 + Math.sin(time) * 0.01;
      const amplitude = 15 + Math.sin(time * 2) * 10;
      const y = canvas.height / 2 + Math.sin(x * frequency + time) * amplitude;
      
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }

  private drawSpectrum(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number): void {
    const bars = 20;
    const barWidth = canvas.width / bars;
    
    for (let i = 0; i < bars; i++) {
      const height = (Math.sin(time + i * 0.3) * 0.5 + 0.5) * canvas.height * 0.8;
      const x = i * barWidth;
      const y = canvas.height - height;
      
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, 'var(--interactive-accent)');
      gradient.addColorStop(1, 'var(--interactive-accent-hover)');
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - 2, height);
    }
  }

  private drawCircularViz(ctx: CanvasRenderingContext2D, centerX: number, centerY: number, time: number): void {
    const radius = 20;
    const points = 12;
    
    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;
      const amplitude = 5 + Math.sin(time + i * 0.5) * 3;
      const x = centerX + Math.cos(angle) * (radius + amplitude);
      const y = centerY + Math.sin(angle) * (radius + amplitude);
      
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private drawBars(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number): void {
    const bars = 15;
    const barWidth = canvas.width / bars;
    
    for (let i = 0; i < bars; i++) {
      const height = (Math.sin(time * 2 + i * 0.8) * 0.5 + 0.5) * canvas.height;
      ctx.fillRect(i * barWidth, canvas.height - height, barWidth - 1, height);
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number): void {
    const particles = 20;
    
    for (let i = 0; i < particles; i++) {
      const x = (Math.sin(time + i) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(time * 1.2 + i * 0.7) * 0.5 + 0.5) * canvas.height;
      const size = 1 + Math.sin(time * 3 + i) * 2;
      
      ctx.beginPath();
      ctx.arc(x, y, Math.abs(size), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Radial chart control methods
  private startRadialAnimations(): void {
    console.log('Starting radial animations...');
  }

  private stopRadialAnimations(): void {
    console.log('Stopping radial animations...');
  }

  private randomizeRadialData(): void {
    // Randomize monthly data
    this.radialData.monthlyData.forEach(item => {
      item.series1 = Math.floor(Math.random() * 600) + 200;
      item.series2 = Math.floor(Math.random() * 500) + 150;
    });
    
    // Randomize categories
    this.radialData.categories.forEach(item => {
      item.value = Math.floor(Math.random() * 40) + 60;
    });
    
    // Redraw all radial charts
    this.redrawAllRadialCharts();
  }

  private cycleRadialTheme(): void {
    this.currentRadialTheme = (this.currentRadialTheme + 1) % this.radialThemes.length;
    this.redrawAllRadialCharts();
  }

  private updateAnimationSpeed(speed: number): void {
    console.log(`Updated animation speed to ${speed}x`);
  }

  private redrawAllRadialCharts(): void {
    const canvases = document.querySelectorAll('.radial-canvas') as NodeListOf<HTMLCanvasElement>;
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (canvas.parentElement?.textContent?.includes('Radial Line')) {
          this.drawRadialLineChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Concentric Ring')) {
          this.drawConcentricRingChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Radial Segment')) {
          this.drawRadialSegmentChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Progress Ring')) {
          this.drawProgressRingChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Radar')) {
          this.drawRadarChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Sunburst')) {
          this.drawSunburstChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Clock')) {
          this.drawClockChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Gauge')) {
          this.drawGaugeChart(canvas);
        }
      }
    });
  }

  // Chart interaction methods
  private animateCharts(): void {
    // Implementation for chart animations
    console.log('Animating charts...');
  }

  private randomizeChartData(): void {
    // Randomize pie chart data
    this.chartData.pieData.forEach(item => {
      item.value = Math.floor(Math.random() * 40) + 10;
    });
    
    // Randomize bar chart data
    this.chartData.barData.forEach(item => {
      item.value = Math.floor(Math.random() * 200) + 50;
    });
    
    // Randomize line data
    this.chartData.lineData.forEach(point => {
      point.y = Math.floor(Math.random() * 120) + 20;
    });
    
    // Redraw all charts
    this.redrawAllCharts();
  }

  private cycleColorScheme(): void {
    this.currentColorScheme = (this.currentColorScheme + 1) % this.colorSchemes.length;
    this.redrawAllCharts();
  }

  private redrawAllCharts(): void {
    const canvases = document.querySelectorAll('.chart-canvas') as NodeListOf<HTMLCanvasElement>;
    canvases.forEach((canvas) => {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        if (canvas.parentElement?.textContent?.includes('Pie')) {
          this.drawPieChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Bar')) {
          this.drawBarChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Line')) {
          this.drawLineChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Area')) {
          this.drawAreaChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Radial')) {
          this.drawRadialChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Column')) {
          this.drawColumnChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Triangle')) {
          this.drawTriangleChart(canvas);
        } else if (canvas.parentElement?.textContent?.includes('Bubble')) {
          this.drawBubbleChart(canvas);
        }
      }
    });
  }

  private initializeDropdownHeights(): void {
    // Use requestAnimationFrame and multiple attempts to ensure content is rendered
    const measureHeights = (attempts = 0) => {
      if (attempts > 10) return; // Give up after 10 attempts
      
      const dropdowns = document.querySelectorAll('.dropdown.open');
      let allMeasured = true;
      
      dropdowns.forEach(dropdown => {
        const content = dropdown.querySelector('.dropdown-content') as HTMLElement;
        if (content) {
          // Temporarily remove ALL height and overflow constraints to get natural height
          const originalMaxHeight = content.style.maxHeight;
          const originalHeight = content.style.height;
          const originalOverflow = content.style.overflow;
          
          content.style.maxHeight = 'none !important';
          content.style.height = 'auto !important';
          content.style.overflow = 'visible !important';
          
          // Force a reflow to ensure styles are applied
          content.offsetHeight;
          
          const contentHeight = content.scrollHeight;
          console.log(`Dropdown ${dropdown.id} attempt ${attempts + 1}: height = ${contentHeight}px, scrollHeight = ${content.scrollHeight}px, offsetHeight = ${content.offsetHeight}px`);
          console.log(`Content innerHTML: "${content.innerHTML}"`);
          console.log(`Content children count: ${content.children.length}`);
          
          if (contentHeight === 0) {
            allMeasured = false;
            // Restore original styles
            content.style.maxHeight = originalMaxHeight;
            content.style.height = originalHeight;
            content.style.overflow = originalOverflow;
          } else {
            // Set the measured height and restore overflow
            content.style.maxHeight = `${contentHeight}px`;
            content.style.height = '';
            content.style.overflow = originalOverflow;
          }
        }
      });
      
      // If some heights are still 0, try again
      if (!allMeasured) {
        setTimeout(() => measureHeights(attempts + 1), 50); // Use setTimeout for more reliable timing
      }
    };
    
    // Start measuring after a brief delay to ensure DOM is ready
    setTimeout(() => measureHeights(), 100);
  }

  private createDropdown(id: string, title: string, items: Array<{id: string, text: string, icon: string}>, style: string): HTMLElement {
    const dropdown = document.createElement('div');
    dropdown.className = `dropdown ${style}-dropdown`;
    dropdown.id = id;

    // Header (draggable)
    const header = document.createElement('div');
    header.className = 'dropdown-header';
    header.draggable = true;
    header.innerHTML = `
      <span class="drag-handle">⋮⋮</span>
      <span class="dropdown-title">${title}</span>
      <span class="dropdown-arrow">▼</span>
    `;

    // Content
    const content = document.createElement('div');
    content.className = 'dropdown-content';
    
    const itemsList = document.createElement('ul');
    itemsList.className = 'dropdown-items';

    items.forEach(item => {
      const listItem = document.createElement('li');
      listItem.className = 'dropdown-item';
      listItem.draggable = true;
      listItem.dataset.itemId = item.id;
      listItem.innerHTML = `
        <span class="item-drag-handle">⋮⋮</span>
        <span class="item-icon">${item.icon}</span>
        <span class="item-text">${item.text}</span>
      `;
      itemsList.appendChild(listItem);
    });

    content.appendChild(itemsList);
    dropdown.appendChild(header);
    dropdown.appendChild(content);

    // Toggle functionality
    header.addEventListener('click', (e) => {
      // Don't toggle if clicking on drag handle
      if ((e.target as HTMLElement).classList.contains('drag-handle')) return;
      
      const isOpening = !dropdown.classList.contains('open');
      
      if (isOpening) {
        // Calculate the actual content height and set it directly
        const contentHeight = content.scrollHeight;
        content.style.maxHeight = `${contentHeight}px`;
      } else {
        // Reset to 0 when closing
        content.style.maxHeight = '0px';
      }
      
      dropdown.classList.toggle('open');
      const arrow = header.querySelector('.dropdown-arrow') as HTMLElement;
      arrow.textContent = dropdown.classList.contains('open') ? '▲' : '▼';
    });

    // Initialize with the dropdown open to show the dynamic height fix
    dropdown.classList.add('open');
    const arrow = header.querySelector('.dropdown-arrow') as HTMLElement;
    arrow.textContent = '▲';

    return dropdown;
  }

  private initializeDragAndDrop(): void {
    let draggedElement: HTMLElement | null = null;
    let draggedType: 'header' | 'item' | null = null;

    // Header drag events
    document.addEventListener('dragstart', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('dropdown-header')) {
        draggedElement = target.parentElement as HTMLElement;
        draggedType = 'header';
        target.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      } else if (target.classList.contains('dropdown-item')) {
        draggedElement = target;
        draggedType = 'item';
        target.classList.add('dragging');
        e.dataTransfer!.effectAllowed = 'move';
      }
    });

    document.addEventListener('dragend', (e) => {
      const target = e.target as HTMLElement;
      target.classList.remove('dragging');
      
      // Remove all drop indicators
      document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      document.querySelectorAll('.dropdown-over').forEach(el => el.classList.remove('dropdown-over'));
      
      draggedElement = null;
      draggedType = null;
    });

    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';

      const target = e.target as HTMLElement;
      const dropTarget = target.closest('.dropdown-container, .dropdown-items');
      
      if (!dropTarget || !draggedElement) return;

      // Remove existing indicators
      document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
      document.querySelectorAll('.dropdown-over').forEach(el => el.classList.remove('dropdown-over'));

      if (draggedType === 'header' && dropTarget.classList.contains('dropdown-container')) {
        dropTarget.classList.add('dropdown-over');
      } else if (draggedType === 'item' && dropTarget.classList.contains('dropdown-items')) {
        const afterElement = this.getDragAfterElement(dropTarget as HTMLElement, e.clientY);
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        
        if (afterElement == null) {
          dropTarget.appendChild(indicator);
        } else {
          dropTarget.insertBefore(indicator, afterElement);
        }
      }
    });

    document.addEventListener('drop', (e) => {
      e.preventDefault();
      const target = e.target as HTMLElement;
      const dropTarget = target.closest('.dropdown-container, .dropdown-items');
      
      if (!dropTarget || !draggedElement) return;

      if (draggedType === 'header' && dropTarget.classList.contains('dropdown-container')) {
        // Move entire dropdown to different container
        const sourceContainer = draggedElement.parentElement;
        if (sourceContainer !== dropTarget) {
          dropTarget.appendChild(draggedElement);
        }
      } else if (draggedType === 'item' && dropTarget.classList.contains('dropdown-items')) {
        // Reorder items within or between lists
        const afterElement = this.getDragAfterElement(dropTarget as HTMLElement, e.clientY);
        
        if (afterElement == null) {
          dropTarget.appendChild(draggedElement);
        } else {
          dropTarget.insertBefore(draggedElement, afterElement);
        }
        
        // Recalculate heights for affected dropdowns
        this.recalculateDropdownHeights(dropTarget);
      }
    });
  }

  private recalculateDropdownHeights(changedElement: HTMLElement): void {
    // Find the dropdown that contains the changed items
    const dropdown = changedElement.closest('.dropdown') as HTMLElement;
    if (!dropdown) return;
    
    // If the dropdown is open, recalculate its height
    if (dropdown.classList.contains('open')) {
      const content = dropdown.querySelector('.dropdown-content') as HTMLElement;
      if (content) {
        const contentHeight = content.scrollHeight;
        content.style.maxHeight = `${contentHeight}px`;
      }
    }
  }

  private getDragAfterElement(container: HTMLElement, y: number): HTMLElement | null {
    const draggableElements = [...container.querySelectorAll('.dropdown-item:not(.dragging)')];
    
    return draggableElements.reduce((closest: any, child: any) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  private renderAudio(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🎵 Audio Visualizers' });

    // Controls section
    const controlsSection = section.createDiv('audio-controls');
    controlsSection.createEl('h3', { text: 'Audio Controls' });
    
    const controlsGrid = controlsSection.createDiv('audio-controls-grid');
    
    const startBtn = controlsGrid.createEl('button', { text: '🎤 Start Audio', cls: 'btn-success' });
    const stopBtn = controlsGrid.createEl('button', { text: '⏹️ Stop Audio', cls: 'btn-danger' });
    const testToneBtn = controlsGrid.createEl('button', { text: '🎵 Test Tone', cls: 'btn-primary' });
    
    // Color scheme selector
    const colorControls = controlsSection.createDiv('color-controls');
    colorControls.createEl('label', { text: 'Color Scheme: ' });
    const colorSelect = colorControls.createEl('select', { cls: 'audio-color-select' });
    ['neon', 'fire', 'ocean', 'rainbow', 'matrix', 'cyberpunk'].forEach(scheme => {
      colorSelect.createEl('option', { text: scheme.charAt(0).toUpperCase() + scheme.slice(1), value: scheme });
    });

    // Visualizers grid
    const visualizersGrid = section.createDiv('audio-visualizers-grid');

    // 1. Waveform Oscilloscope
    const waveformContainer = visualizersGrid.createDiv('audio-visualizer-container');
    waveformContainer.createEl('h4', { text: '🌊 Waveform Oscilloscope' });
    const waveformCanvas = waveformContainer.createEl('canvas', { cls: 'audio-canvas' });
    waveformCanvas.id = 'showcase-waveform';

    // 2. Frequency Bars
    const frequencyContainer = visualizersGrid.createDiv('audio-visualizer-container');
    frequencyContainer.createEl('h4', { text: '📊 Frequency Spectrum' });
    const frequencyCanvas = frequencyContainer.createEl('canvas', { cls: 'audio-canvas' });
    frequencyCanvas.id = 'showcase-frequency';

    // 3. Circular Visualizer
    const circularContainer = visualizersGrid.createDiv('audio-visualizer-container');
    circularContainer.createEl('h4', { text: '⭕ Circular Frequency' });
    const circularCanvas = circularContainer.createEl('canvas', { cls: 'audio-canvas' });
    circularCanvas.id = 'showcase-circular';

    // 4. VU Meters
    const vuContainer = visualizersGrid.createDiv('audio-visualizer-container');
    vuContainer.createEl('h4', { text: '📶 VU Meters' });
    const vuCanvas = vuContainer.createEl('canvas', { cls: 'audio-canvas' });
    vuCanvas.id = 'showcase-vu';

    // 5. Particle System
    const particleContainer = visualizersGrid.createDiv('audio-visualizer-container');
    particleContainer.createEl('h4', { text: '💫 Particle System' });
    const particleCanvas = particleContainer.createEl('canvas', { cls: 'audio-canvas' });
    particleCanvas.id = 'showcase-particle';

    // 6. 3D Cube
    const cubeContainer = visualizersGrid.createDiv('audio-visualizer-container');
    cubeContainer.createEl('h4', { text: '🧊 3D Audio Cube' });
    const cubeCanvas = cubeContainer.createEl('canvas', { cls: 'audio-canvas' });
    cubeCanvas.id = 'showcase-cube';

    // 7. Beat Detection
    const beatContainer = visualizersGrid.createDiv('audio-visualizer-container');
    beatContainer.createEl('h4', { text: '🥁 Beat Detection' });
    const beatCanvas = beatContainer.createEl('canvas', { cls: 'audio-canvas' });
    beatCanvas.id = 'showcase-beat';

    // 8. Spectrogram
    const spectrogramContainer = visualizersGrid.createDiv('audio-visualizer-container');
    spectrogramContainer.createEl('h4', { text: '🌈 Spectrogram Waterfall' });
    const spectrogramCanvas = spectrogramContainer.createEl('canvas', { cls: 'audio-canvas' });
    spectrogramCanvas.id = 'showcase-spectrogram';

    // Initialize audio visualizer system
    this.initializeAudioVisualizers(section);

    // Add event handlers
    let audioSystem: any = null;
    let isPlaying = false;

    startBtn.onclick = async () => {
      try {
        if (!audioSystem) {
          audioSystem = new AudioVisualizerSystem();
        }
        await audioSystem.startAudio();
        isPlaying = true;
        startBtn.disabled = true;
        stopBtn.disabled = false;
        section.classList.add('audio-active');
      } catch (error) {
        console.error('Failed to start audio:', error);
      }
    };

    stopBtn.onclick = () => {
      if (audioSystem) {
        audioSystem.stopAudio();
        isPlaying = false;
        startBtn.disabled = false;
        stopBtn.disabled = true;
        section.classList.remove('audio-active');
      }
    };

    testToneBtn.onclick = () => {
      if (!audioSystem) {
        audioSystem = new AudioVisualizerSystem();
      }
      audioSystem.playTestTone();
    };

    colorSelect.addEventListener('change', (e) => {
      if (audioSystem) {
        audioSystem.setColorScheme((e.target as HTMLSelectElement).value);
      }
    });

    // Initially disable stop button
    stopBtn.disabled = true;
  }

  private initializeAudioVisualizers(container: HTMLElement): void {
    // Add demo mode with animated fake data
    const canvases = container.querySelectorAll('.audio-canvas') as NodeListOf<HTMLCanvasElement>;
    
    canvases.forEach((canvas, index) => {
      canvas.width = 300;
      canvas.height = 150;
      const ctx = canvas.getContext('2d')!;
      
      // Create demo animation for each visualizer type
      const animate = () => {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const time = Date.now() * 0.001;
        
        switch (index) {
          case 0: // Waveform
            this.drawDemoWaveform(ctx, canvas.width, canvas.height, time);
            break;
          case 1: // Frequency bars
            this.drawDemoFrequencyBars(ctx, canvas.width, canvas.height, time);
            break;
          case 2: // Circular
            this.drawDemoCircular(ctx, canvas.width, canvas.height, time);
            break;
          case 3: // VU Meters
            this.drawDemoVUMeters(ctx, canvas.width, canvas.height, time);
            break;
          case 4: // Particles
            this.drawDemoParticles(ctx, canvas.width, canvas.height, time);
            break;
          case 5: // 3D Cube
            this.drawDemo3DCube(ctx, canvas.width, canvas.height, time);
            break;
          case 6: // Beat detection
            this.drawDemoBeatDetection(ctx, canvas.width, canvas.height, time);
            break;
          case 7: // Spectrogram
            this.drawDemoSpectrogram(ctx, canvas.width, canvas.height, time);
            break;
        }
        
        requestAnimationFrame(animate);
      };
      
      animate();
    });
  }

  private drawDemoWaveform(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    for (let x = 0; x < width; x++) {
      const y = height / 2 + Math.sin((x + time * 100) * 0.02) * (height / 4) * Math.sin(time * 2);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    
    ctx.stroke();
  }

  private drawDemoFrequencyBars(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const bars = 32;
    const barWidth = width / bars;
    
    for (let i = 0; i < bars; i++) {
      const barHeight = (Math.sin(time * 3 + i * 0.3) + 1) * height / 2;
      const hue = (i / bars) * 360;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
    }
  }

  private drawDemoCircular(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 4;
    const bars = 64;
    
    for (let i = 0; i < bars; i++) {
      const angle = (i / bars) * Math.PI * 2;
      const barHeight = (Math.sin(time * 2 + i * 0.1) + 1) * 30;
      const x1 = centerX + Math.cos(angle) * radius;
      const y1 = centerY + Math.sin(angle) * radius;
      const x2 = centerX + Math.cos(angle) * (radius + barHeight);
      const y2 = centerY + Math.sin(angle) * (radius + barHeight);
      
      const hue = (i / bars) * 360 + time * 50;
      ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  }

  private drawDemoVUMeters(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const meterWidth = width / 6;
    const meterHeight = height * 0.8;
    const meterSpacing = width / 4;
    
    // Left channel
    const leftLevel = (Math.sin(time * 3) + 1) / 2;
    const leftHeight = leftLevel * meterHeight;
    
    // Right channel  
    const rightLevel = (Math.sin(time * 3.5) + 1) / 2;
    const rightHeight = rightLevel * meterHeight;
    
    // Draw left meter
    ctx.fillStyle = '#333';
    ctx.fillRect(meterSpacing - meterWidth/2, (height - meterHeight)/2, meterWidth, meterHeight);
    
    // Left meter fill
    const leftGradient = ctx.createLinearGradient(0, height, 0, 0);
    leftGradient.addColorStop(0, '#00ff00');
    leftGradient.addColorStop(0.7, '#ffff00');
    leftGradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = leftGradient;
    ctx.fillRect(meterSpacing - meterWidth/2, height - (height - meterHeight)/2 - leftHeight, meterWidth, leftHeight);
    
    // Draw right meter
    ctx.fillStyle = '#333';
    ctx.fillRect(width - meterSpacing - meterWidth/2, (height - meterHeight)/2, meterWidth, meterHeight);
    
    // Right meter fill
    const rightGradient = ctx.createLinearGradient(0, height, 0, 0);
    rightGradient.addColorStop(0, '#00ff00');
    rightGradient.addColorStop(0.7, '#ffff00');
    rightGradient.addColorStop(1, '#ff0000');
    ctx.fillStyle = rightGradient;
    ctx.fillRect(width - meterSpacing - meterWidth/2, height - (height - meterHeight)/2 - rightHeight, meterWidth, rightHeight);
    
    // Labels
    ctx.fillStyle = '#fff';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('L', meterSpacing, height - 10);
    ctx.fillText('R', width - meterSpacing, height - 10);
  }

  private drawDemoParticles(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const particles = 20;
    
    for (let i = 0; i < particles; i++) {
      const x = (Math.sin(time + i) + 1) * width / 2;
      const y = (Math.cos(time * 1.5 + i) + 1) * height / 2;
      const size = (Math.sin(time * 2 + i) + 1) * 5;
      const hue = (time * 100 + i * 20) % 360;
      
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.8)`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
      
      // Particle trails
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - Math.sin(time + i) * 20, y - Math.cos(time + i) * 20);
      ctx.stroke();
    }
  }

  private drawDemo3DCube(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    const size = 40;
    
    // 3D rotation
    const rotX = time * 0.5;
    const rotY = time * 0.7;
    
    // Cube vertices
    const vertices = [
      [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
      [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
    ];
    
    // Project 3D to 2D
    const projected = vertices.map(([x, y, z]) => {
      // Rotate around Y axis
      const cos = Math.cos(rotY), sin = Math.sin(rotY);
      const x1 = x * cos - z * sin;
      const z1 = x * sin + z * cos;
      
      // Rotate around X axis  
      const cos2 = Math.cos(rotX), sin2 = Math.sin(rotX);
      const y1 = y * cos2 - z1 * sin2;
      const z2 = y * sin2 + z1 * cos2;
      
      // Project to 2D
      const scale = size / (3 + z2);
      return [centerX + x1 * scale, centerY + y1 * scale];
    });
    
    // Draw cube edges
    const edges = [
      [0,1],[1,2],[2,3],[3,0], // front face
      [4,5],[5,6],[6,7],[7,4], // back face
      [0,4],[1,5],[2,6],[3,7]  // connecting edges
    ];
    
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    
    edges.forEach(([a, b]) => {
      const [x1, y1] = projected[a];
      const [x2, y2] = projected[b];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    });
    
    // Add some audio-reactive glow
    const intensity = (Math.sin(time * 4) + 1) / 2;
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = intensity * 10;
    ctx.strokeStyle = `rgba(0, 255, 255, ${intensity})`;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  private drawDemoBeatDetection(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Simulate beat detection
    const beatTime = time * 2;
    const isBeat = Math.sin(beatTime) > 0.8;
    const beatIntensity = isBeat ? 1 : Math.max(0, Math.sin(beatTime) * 0.3);
    
    // Beat circle
    const radius = 30 + beatIntensity * 50;
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
    gradient.addColorStop(0, `rgba(255, 0, 100, ${beatIntensity})`);
    gradient.addColorStop(1, 'rgba(255, 0, 100, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fill();
    
    // Beat rings
    for (let i = 0; i < 3; i++) {
      const ringRadius = 20 + i * 15 + beatIntensity * 20;
      ctx.strokeStyle = `rgba(255, 255, 255, ${(1 - i * 0.3) * beatIntensity})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(centerX, centerY, ringRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // BPM text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.round(120 + Math.sin(time) * 20)} BPM`, centerX, centerY + 80);
  }

  private drawDemoSpectrogram(ctx: CanvasRenderingContext2D, width: number, height: number, time: number): void {
    // Shift existing pixels left
    const imageData = ctx.getImageData(1, 0, width - 1, height);
    ctx.putImageData(imageData, 0, 0);
    
    // Draw new frequency column
    const frequencies = 64;
    const bandHeight = height / frequencies;
    
    for (let i = 0; i < frequencies; i++) {
      const frequency = (Math.sin(time * 3 + i * 0.1) + 1) / 2;
      const intensity = Math.pow(frequency, 2);
      
      // Color based on frequency and intensity
      const hue = (i / frequencies) * 240; // Blue to red
      const saturation = 100;
      const lightness = intensity * 80;
      
      ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      ctx.fillRect(width - 1, height - (i + 1) * bandHeight, 1, bandHeight);
    }
  }

  private renderGifs(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🎬 GIFs & Animated Media' });

    // Loading animations
    const loadingSection = section.createDiv('gif-category');
    loadingSection.createEl('h3', { text: '⏳ Loading Animations' });
    
    const loadingGrid = loadingSection.createDiv('gif-grid');
    
    // CSS-only loading spinners
    const cssSpinner = loadingGrid.createDiv('gif-demo-card');
    cssSpinner.createEl('h4', { text: 'CSS Spinner' });
    const spinnerDiv = cssSpinner.createDiv('css-loading-spinner');
    
    // Pulsing dots
    const pulsingDots = loadingGrid.createDiv('gif-demo-card');
    pulsingDots.createEl('h4', { text: 'Pulsing Dots' });
    const dotsContainer = pulsingDots.createDiv('pulsing-dots');
    for (let i = 0; i < 3; i++) {
      dotsContainer.createDiv('dot');
    }
    
    // Wave animation
    const waveLoader = loadingGrid.createDiv('gif-demo-card');
    waveLoader.createEl('h4', { text: 'Wave Loader' });
    const waveContainer = waveLoader.createDiv('wave-loader');
    for (let i = 0; i < 5; i++) {
      waveContainer.createDiv('wave-bar');
    }

    // Celebration animations
    const celebrationSection = section.createDiv('gif-category');
    celebrationSection.createEl('h3', { text: '🎉 Celebration & Success' });
    
    const celebrationGrid = celebrationSection.createDiv('gif-grid');
    
    // Confetti animation
    const confetti = celebrationGrid.createDiv('gif-demo-card');
    confetti.createEl('h4', { text: 'Confetti Burst' });
    const confettiContainer = confetti.createDiv('confetti-container');
    for (let i = 0; i < 20; i++) {
      const piece = confettiContainer.createDiv('confetti-piece');
      piece.style.left = Math.random() * 100 + '%';
      piece.style.animationDelay = Math.random() * 2 + 's';
    }
    
    // Success checkmark
    const successCheck = celebrationGrid.createDiv('gif-demo-card');
    successCheck.createEl('h4', { text: 'Success Animation' });
    const checkContainer = successCheck.createDiv('success-check');
    checkContainer.innerHTML = '✓';
    
    // Party emoji
    const partyEmoji = celebrationGrid.createDiv('gif-demo-card');
    partyEmoji.createEl('h4', { text: 'Party Mode' });
    const emojiContainer = partyEmoji.createDiv('party-emoji');
    emojiContainer.textContent = '🎉';

    // Background animations
    const backgroundSection = section.createDiv('gif-category');
    backgroundSection.createEl('h3', { text: '🌊 Background Effects' });
    
    const backgroundGrid = backgroundSection.createDiv('gif-grid');
    
    // Floating particles
    const floatingParticles = backgroundGrid.createDiv('gif-demo-card floating-bg');
    floatingParticles.createEl('h4', { text: 'Floating Particles' });
    const particleContainer = floatingParticles.createDiv('particle-bg');
    for (let i = 0; i < 15; i++) {
      const particle = particleContainer.createDiv('floating-particle');
      particle.style.left = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 5 + 's';
      particle.style.animationDuration = (3 + Math.random() * 4) + 's';
    }
    
    // Gradient shift
    const gradientShift = backgroundGrid.createDiv('gif-demo-card gradient-bg');
    gradientShift.createEl('h4', { text: 'Gradient Animation' });
    gradientShift.createDiv('gradient-content').textContent = 'Dynamic Background';
    
    // Matrix effect
    const matrixEffect = backgroundGrid.createDiv('gif-demo-card matrix-bg');
    matrixEffect.createEl('h4', { text: 'Matrix Effect' });
    const matrixContainer = matrixEffect.createDiv('matrix-container');
    for (let i = 0; i < 10; i++) {
      const column = matrixContainer.createDiv('matrix-column');
      column.style.left = i * 10 + '%';
      column.style.animationDelay = Math.random() * 2 + 's';
    }

    // Interactive GIFs
    const interactiveSection = section.createDiv('gif-category');
    interactiveSection.createEl('h3', { text: '🎮 Interactive Animations' });
    
    const interactiveGrid = interactiveSection.createDiv('gif-grid');
    
    // Hover effects
    const hoverCard = interactiveGrid.createDiv('gif-demo-card hover-demo');
    hoverCard.createEl('h4', { text: 'Hover Animations' });
    const hoverContent = hoverCard.createDiv('hover-content');
    hoverContent.textContent = 'Hover me!';
    
    // Click animations
    const clickCard = interactiveGrid.createDiv('gif-demo-card click-demo');
    clickCard.createEl('h4', { text: 'Click Effects' });
    const clickButton = clickCard.createEl('button', { text: 'Click me!', cls: 'click-effect-btn' });
    
    clickButton.addEventListener('click', () => {
      clickButton.classList.add('clicked');
      setTimeout(() => clickButton.classList.remove('clicked'), 600);
    });
    
    // Typing animation
    const typingCard = interactiveGrid.createDiv('gif-demo-card');
    typingCard.createEl('h4', { text: 'Typing Effect' });
    const typingText = typingCard.createDiv('typing-text');
    
    const message = 'Hello from Obsidian!';
    let i = 0;
    const typeWriter = () => {
      if (i < message.length) {
        typingText.textContent += message.charAt(i);
        i++;
        setTimeout(typeWriter, 150);
      } else {
        setTimeout(() => {
          typingText.textContent = '';
          i = 0;
          typeWriter();
        }, 2000);
      }
    };
    typeWriter();

    // Real GIF examples
    const realGifSection = section.createDiv('gif-category');
    realGifSection.createEl('h3', { text: '🖼️ Embedded GIF Examples' });
    
    const gifGrid = realGifSection.createDiv('gif-grid');
    
    // Create some sample GIF placeholders (using CSS animations to simulate)
    const simSpinner = gifGrid.createDiv('gif-demo-card');
    simSpinner.createEl('h4', { text: 'Loading GIF Simulation' });
    const spinnerGif = simSpinner.createDiv('gif-placeholder spinner-gif');
    spinnerGif.textContent = '⏳';
    
    const simSuccess = gifGrid.createDiv('gif-demo-card');
    simSuccess.createEl('h4', { text: 'Success GIF Simulation' });
    const successGif = simSuccess.createDiv('gif-placeholder success-gif');
    successGif.textContent = '✅';
    
    const simError = gifGrid.createDiv('gif-demo-card');
    simError.createEl('h4', { text: 'Error GIF Simulation' });
    const errorGif = simError.createDiv('gif-placeholder error-gif');
    errorGif.textContent = '❌';

    // Code examples
    const codeSection = section.createDiv('gif-category');
    codeSection.createEl('h3', { text: '💻 Implementation Examples' });
    
    const codeExample = codeSection.createDiv('code-example');
    codeExample.innerHTML = `
      <pre><code>// Adding a GIF to your plugin
const gifElement = container.createEl('img', {
  attr: {
    src: 'https://media.giphy.com/media/example.gif',
    alt: 'Loading animation',
    style: 'width: 64px; height: 64px; border-radius: 8px;'
  }
});

// CSS-only animation alternative
const loader = container.createDiv('css-loader');
// Add corresponding CSS for smooth animations</code></pre>
    `;
  }

  private renderPlacement(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '📍 UI Placement Zones in Obsidian' });

    // Create a visual map of Obsidian UI zones
    const uiMap = section.createDiv('obsidian-ui-map');
    
    // Header/Title bar area
    const headerSection = section.createDiv('placement-category');
    headerSection.createEl('h3', { text: '🎯 Header & Title Bar Customizations' });
    
    const headerGrid = headerSection.createDiv('placement-grid');
    
    // Page header
    const pageHeader = headerGrid.createDiv('placement-demo');
    pageHeader.createEl('h4', { text: '📄 Page Header' });
    const headerExample = pageHeader.createDiv('demo-header');
    headerExample.innerHTML = `
      <div class="custom-page-header">
        <span class="header-icon">📝</span>
        <span class="header-title">My Custom Page</span>
        <div class="header-actions">
          <button class="header-btn">⭐</button>
          <button class="header-btn">🔗</button>
          <button class="header-btn">⚙️</button>
        </div>
      </div>
    `;
    
    // Document title modifications
    const titleMod = headerGrid.createDiv('placement-demo');
    titleMod.createEl('h4', { text: '📑 Document Title Area' });
    const titleExample = titleMod.createDiv('demo-title');
    titleExample.innerHTML = `
      <div class="custom-title-area">
        <div class="title-prefix">🚀</div>
        <div class="title-text">Enhanced Document.md</div>
        <div class="title-suffix">
          <span class="word-count">1,234 words</span>
          <span class="status-badge">✅ Saved</span>
        </div>
      </div>
    `;

    // Sidebar placement
    const sidebarSection = section.createDiv('placement-category');
    sidebarSection.createEl('h3', { text: '📱 Sidebar Placements' });
    
    const sidebarGrid = sidebarSection.createDiv('placement-grid');
    
    // Left ribbon
    const leftRibbon = sidebarGrid.createDiv('placement-demo');
    leftRibbon.createEl('h4', { text: '📌 Left Ribbon Icons' });
    const ribbonExample = leftRibbon.createDiv('demo-ribbon');
    ['🎮', '🎨', '🎵', '⚡', '🔥'].forEach(icon => {
      const ribbonIcon = ribbonExample.createDiv('ribbon-icon');
      ribbonIcon.textContent = icon;
    });
    
    // Right sidebar panels
    const rightSidebar = sidebarGrid.createDiv('placement-demo');
    rightSidebar.createEl('h4', { text: '🗂️ Sidebar Panels' });
    const sidebarExample = rightSidebar.createDiv('demo-sidebar-panel');
    sidebarExample.innerHTML = `
      <div class="panel-header">🎯 Custom Panel</div>
      <div class="panel-content">
        <div class="panel-item">📊 Analytics</div>
        <div class="panel-item">🎨 Themes</div>
        <div class="panel-item">⚙️ Settings</div>
      </div>
    `;

    // Status and notification areas
    const statusSection = section.createDiv('placement-category');
    statusSection.createEl('h3', { text: '📊 Status & Notification Areas' });
    
    const statusGrid = statusSection.createDiv('placement-grid');
    
    // Status bar
    const statusBar = statusGrid.createDiv('placement-demo');
    statusBar.createEl('h4', { text: '📈 Status Bar Items' });
    const statusExample = statusBar.createDiv('demo-status-bar');
    statusExample.innerHTML = `
      <div class="status-item">🎮 Level 42</div>
      <div class="status-item">⚡ 1,234 keystrokes</div>
      <div class="status-item">🎵 Audio Active</div>
    `;
    
    // Toast notifications
    const notifications = statusGrid.createDiv('placement-demo');
    notifications.createEl('h4', { text: '🔔 Toast Notifications' });
    const toastExample = notifications.createDiv('demo-toast-container');
    
    const showToastBtn = toastExample.createEl('button', { text: 'Show Toast', cls: 'btn-primary' });
    showToastBtn.onclick = () => {
      const toast = toastExample.createDiv('demo-toast');
      toast.innerHTML = '✅ Action completed successfully!';
      setTimeout(() => toast.remove(), 3000);
    };

    // Modal and overlay areas
    const modalSection = section.createDiv('placement-category');
    modalSection.createEl('h3', { text: '🎭 Modals & Overlays' });
    
    const modalGrid = modalSection.createDiv('placement-grid');
    
    // Center modal
    const centerModal = modalGrid.createDiv('placement-demo');
    centerModal.createEl('h4', { text: '🎯 Center Modal' });
    const modalBtn = centerModal.createEl('button', { text: 'Show Modal', cls: 'btn-secondary' });
    
    modalBtn.onclick = () => {
      const overlay = document.createDiv('demo-modal-overlay');
      const modal = overlay.createDiv('demo-modal');
      modal.innerHTML = `
        <div class="modal-header">
          <h3>🎨 Custom Modal</h3>
          <button class="modal-close">✕</button>
        </div>
        <div class="modal-body">
          <p>This is a custom modal with beautiful styling!</p>
          <div class="modal-actions">
            <button class="btn-primary">Confirm</button>
            <button class="btn-secondary">Cancel</button>
          </div>
        </div>
      `;
      
      document.body.appendChild(overlay);
      
      const closeBtn = modal.querySelector('.modal-close');
      closeBtn?.addEventListener('click', () => overlay.remove());
      overlay.onclick = (e) => {
        if (e.target === overlay) overlay.remove();
      };
    };

    // Command palette area
    const commandSection = section.createDiv('placement-category');
    commandSection.createEl('h3', { text: '⌨️ Command Integration' });
    
    const commandExample = commandSection.createDiv('placement-demo full-width');
    commandExample.createEl('h4', { text: '🎮 Command Palette Integration' });
    const commandDemo = commandExample.createDiv('demo-command-palette');
    commandDemo.innerHTML = `
      <div class="command-item">
        <span class="command-icon">🎨</span>
        <span class="command-name">Open UI Showcase</span>
        <span class="command-hotkey">Ctrl+Shift+U</span>
      </div>
      <div class="command-item">
        <span class="command-icon">🎵</span>
        <span class="command-name">Start Audio Visualizer</span>
        <span class="command-hotkey">Ctrl+Shift+A</span>
      </div>
      <div class="command-item">
        <span class="command-icon">🎮</span>
        <span class="command-name">Open TCG Dashboard</span>
        <span class="command-hotkey">Ctrl+Shift+T</span>
      </div>
    `;

    // Context menus
    const contextSection = section.createDiv('placement-category');
    contextSection.createEl('h3', { text: '📝 Context Menus & Editor Integration' });
    
    const contextGrid = contextSection.createDiv('placement-grid');
    
    // Right-click context menu
    const contextMenu = contextGrid.createDiv('placement-demo');
    contextMenu.createEl('h4', { text: '🖱️ Context Menu' });
    const contextBtn = contextMenu.createEl('button', { text: 'Right Click Me', cls: 'btn-secondary' });
    
    contextBtn.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const menu = document.createDiv('demo-context-menu');
      menu.style.left = e.clientX + 'px';
      menu.style.top = e.clientY + 'px';
      menu.innerHTML = `
        <div class="context-item">✨ Enhance Text</div>
        <div class="context-item">🏷️ Add Tags</div>
        <div class="context-item">🔗 Create Link</div>
        <div class="context-separator"></div>
        <div class="context-item">🎨 Style Options</div>
      `;
      
      document.body.appendChild(menu);
      setTimeout(() => menu.remove(), 3000);
    });

    // Implementation tips
    const tipsSection = section.createDiv('placement-category');
    tipsSection.createEl('h3', { text: '💡 Implementation Tips' });
    
    const tipsGrid = tipsSection.createDiv('tips-grid');
    
    const tips = [
      {
        title: '🎯 Status Bar Items',
        code: `this.addStatusBarItem().setText('🎮 Level 42');`
      },
      {
        title: '📌 Ribbon Icons',
        code: `this.addRibbonIcon('dice', 'TCG Dashboard', () => {
  // Open your custom view
});`
      },
      {
        title: '🗂️ Custom Views',
        code: `this.registerView(VIEW_TYPE_CUSTOM, 
  (leaf) => new CustomView(leaf));`
      },
      {
        title: '⌨️ Commands',
        code: `this.addCommand({
  id: 'custom-action',
  name: 'Custom Action',
  callback: () => { /* action */ }
});`
      }
    ];

    tips.forEach(tip => {
      const tipCard = tipsGrid.createDiv('tip-card');
      tipCard.createEl('h4', { text: tip.title });
      const codeBlock = tipCard.createEl('pre');
      codeBlock.createEl('code', { text: tip.code });
    });
  }

  private renderThemes(container: HTMLElement): void {
    const section = container.createDiv('showcase-section');
    section.createEl('h2', { text: '🌙 Theme Variants' });

    const themeGrid = section.createDiv('theme-grid');

    // Light theme demo
    const lightTheme = themeGrid.createDiv('theme-demo light-theme');
    lightTheme.createEl('h4', { text: 'Light Theme' });
    lightTheme.createEl('button', { text: 'Light Button', cls: 'theme-btn' });
    lightTheme.createDiv('theme-card').createEl('p', { text: 'Light theme card' });

    // Dark theme demo
    const darkTheme = themeGrid.createDiv('theme-demo dark-theme');
    darkTheme.createEl('h4', { text: 'Dark Theme' });
    darkTheme.createEl('button', { text: 'Dark Button', cls: 'theme-btn' });
    darkTheme.createDiv('theme-card').createEl('p', { text: 'Dark theme card' });

    // Neon theme demo
    const neonTheme = themeGrid.createDiv('theme-demo neon-theme');
    neonTheme.createEl('h4', { text: 'Neon Theme' });
    neonTheme.createEl('button', { text: 'Neon Button', cls: 'theme-btn' });
    neonTheme.createDiv('theme-card').createEl('p', { text: 'Neon theme card' });

    // Nature theme demo
    const natureTheme = themeGrid.createDiv('theme-demo nature-theme');
    natureTheme.createEl('h4', { text: 'Nature Theme' });
    natureTheme.createEl('button', { text: 'Nature Button', cls: 'theme-btn' });
    natureTheme.createDiv('theme-card').createEl('p', { text: 'Nature theme card' });
  }

  private addShowcaseStyles(): void {
    if (document.querySelector('#ui-showcase-styles')) return;

    const style = document.createElement('style');
    style.id = 'ui-showcase-styles';
    style.textContent = `
      /* Navigation */
      .ui-showcase-nav {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 20px;
        padding: 15px;
        background: var(--background-secondary);
        border-radius: 10px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .nav-btn {
        padding: 8px 16px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        color: var(--text-normal);
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 12px;
      }
      
      .nav-btn:hover {
        background: var(--background-modifier-hover);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .nav-btn.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      }
      
      /* Content */
      .ui-showcase-content {
        padding: 20px;
      }
      
      .showcase-section {
        max-width: 100%;
      }
      
      .showcase-section h2 {
        color: var(--text-accent);
        margin-bottom: 20px;
        font-size: 1.5em;
      }
      
      /* Button Styles */
      .button-group {
        margin-bottom: 25px;
      }
      
      .button-group h3 {
        margin-bottom: 10px;
        color: var(--text-muted);
      }
      
      .button-group button {
        margin: 5px;
        padding: 10px 20px;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      
      .btn-secondary {
        background: var(--background-modifier-border);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border-hover);
      }
      
      .btn-success {
        background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        color: white;
      }
      
      .btn-warning {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
      }
      
      .btn-danger {
        background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
        color: white;
      }
      
      .btn-glow {
        background: #4c51bf;
        color: white;
        box-shadow: 0 0 20px rgba(76, 81, 191, 0.6);
        animation: pulse-glow 2s infinite;
      }
      
      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 20px rgba(76, 81, 191, 0.6); }
        50% { box-shadow: 0 0 30px rgba(76, 81, 191, 0.9); }
      }
      
      .btn-gradient {
        background: linear-gradient(45deg, #667eea, #764ba2, #f093fb, #f5576c);
        background-size: 300% 300%;
        color: white;
        animation: gradient-shift 3s ease infinite;
      }
      
      @keyframes gradient-shift {
        0% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      
      .btn-neon {
        background: transparent;
        color: #00ff88;
        border: 2px solid #00ff88;
        text-shadow: 0 0 10px #00ff88;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      }
      
      .btn-neon:hover {
        background: #00ff88;
        color: black;
        box-shadow: 0 0 30px rgba(0, 255, 136, 0.8);
      }
      
      .btn-glass {
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.3);
        color: var(--text-normal);
      }
      
      .btn-icon {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: var(--interactive-accent);
        color: white;
        font-size: 16px;
      }
      
      .btn-floating {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: var(--interactive-accent);
        color: white;
        font-size: 24px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 1000;
      }
      
      .btn-small { padding: 6px 12px; font-size: 12px; }
      .btn-large { padding: 14px 28px; font-size: 16px; }
      
      /* Cards */
      .cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .card {
        padding: 20px;
        border-radius: 12px;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      
      .basic-card {
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }
      
      .basic-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 16px rgba(0,0,0,0.2);
      }
      
      .gradient-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .stat-card {
        background: var(--background-secondary);
        border-left: 4px solid var(--interactive-accent);
      }
      
      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
      }
      
      .stat-value {
        font-size: 2em;
        font-weight: bold;
        color: var(--text-accent);
        margin: 10px 0;
      }
      
      .stat-change {
        font-size: 0.9em;
        padding: 4px 8px;
        border-radius: 4px;
      }
      
      .stat-change.positive {
        background: rgba(76, 175, 80, 0.1);
        color: #4caf50;
      }
      
      .interactive-card {
        background: var(--background-primary);
        border: 2px solid transparent;
        transition: all 0.3s ease;
      }
      
      .interactive-card:hover {
        border-color: var(--interactive-accent);
        transform: scale(1.02);
      }
      
      .interactive-card.card-clicked {
        animation: card-pulse 0.3s ease;
      }
      
      @keyframes card-pulse {
        0% { transform: scale(1.02); }
        50% { transform: scale(1.05); }
        100% { transform: scale(1.02); }
      }
      
      .progress-card {
        background: var(--background-primary);
      }
      
      .progress-bar {
        width: 100%;
        height: 8px;
        background: var(--background-modifier-border);
        border-radius: 4px;
        overflow: hidden;
        margin-top: 10px;
      }
      
      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, var(--interactive-accent), var(--text-accent));
        transition: width 0.5s ease;
      }
      
      .progress-fill.animated {
        animation: progress-shimmer 1.5s infinite;
      }
      
      @keyframes progress-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      /* Form Elements */
      .form-demo {
        max-width: 500px;
      }
      
      .input-group {
        margin-bottom: 20px;
      }
      
      .input-group label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
        color: var(--text-normal);
      }
      
      .modern-input {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 14px;
        transition: all 0.3s ease;
      }
      
      .modern-input:focus {
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        outline: none;
      }
      
      .search-container {
        position: relative;
      }
      
      .search-input {
        width: 100%;
        padding: 12px 16px 12px 40px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 20px;
        background: var(--background-primary);
      }
      
      .search-icon {
        position: absolute;
        left: 12px;
        top: 50%;
        transform: translateY(-50%);
        color: var(--text-muted);
      }
      
      .custom-dropdown {
        position: relative;
      }
      
      .dropdown-btn {
        width: 100%;
        padding: 12px 16px;
        border: 2px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        text-align: left;
        cursor: pointer;
      }
      
      .dropdown-content {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        display: none;
      }
      
      .dropdown-option {
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .dropdown-option:hover {
        background: var(--background-modifier-hover);
      }
      
      .toggle-switch {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 10px;
      }
      
      .toggle-input {
        position: relative;
        width: 50px;
        height: 24px;
        appearance: none;
        background: var(--background-modifier-border);
        border-radius: 12px;
        cursor: pointer;
        transition: background 0.3s ease;
      }
      
      .toggle-input:checked {
        background: var(--interactive-accent);
      }
      
      .toggle-input::before {
        content: '';
        position: absolute;
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: white;
        top: 2px;
        left: 2px;
        transition: transform 0.3s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .toggle-input:checked::before {
        transform: translateX(26px);
      }
      
      .toggle-input.modern {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      /* Animations */
      .animation-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 20px;
        margin-bottom: 30px;
      }
      
      .anim-box {
        padding: 20px;
        background: var(--background-secondary);
        border-radius: 8px;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
      }
      
      .fade-in {
        animation: fadeIn 1s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .slide-in {
        animation: slideIn 1s ease;
      }
      
      @keyframes slideIn {
        from { transform: translateX(-100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      .scale-in {
        animation: scaleIn 1s ease;
      }
      
      @keyframes scaleIn {
        from { transform: scale(0); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      
      .bounce-in {
        animation: bounceIn 1s ease;
      }
      
      @keyframes bounceIn {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); opacity: 1; }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }
      
      .pulse {
        animation: pulse 2s infinite;
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
      
      .rotate-icon {
        font-size: 2em;
        animation: rotate 2s linear infinite;
      }
      
      @keyframes rotate {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .animation-controls {
        text-align: center;
        margin-top: 20px;
      }
      
      /* Layouts */
      .layout-demo {
        margin-bottom: 30px;
        padding: 20px;
        background: var(--background-secondary);
        border-radius: 8px;
      }
      
      .flex-row {
        display: flex;
        gap: 10px;
        margin-bottom: 20px;
      }
      
      .flex-item {
        flex: 1;
        padding: 15px;
        background: var(--background-primary);
        border-radius: 6px;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
      }
      
      .flex-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
        gap: 10px;
      }
      
      .grid-item {
        padding: 15px;
        background: var(--background-primary);
        border-radius: 6px;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
      }
      
      .sidebar-demo {
        display: flex;
        height: 200px;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .demo-sidebar {
        width: 200px;
        background: var(--background-primary);
        padding: 15px;
        border-right: 1px solid var(--background-modifier-border);
      }
      
      .demo-main {
        flex: 1;
        padding: 15px;
        background: var(--background-secondary);
      }
      
      .tab-container {
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .tab-headers {
        display: flex;
        background: var(--background-secondary);
      }
      
      .tab-header {
        padding: 12px 20px;
        cursor: pointer;
        border-right: 1px solid var(--background-modifier-border);
        transition: background 0.2s ease;
      }
      
      .tab-header:hover {
        background: var(--background-modifier-hover);
      }
      
      .tab-header.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }
      
      .tab-content {
        display: none;
        padding: 20px;
        background: var(--background-primary);
      }
      
      .tab-content.active {
        display: block;
      }
      
      /* Indicators */
      .indicator-group {
        margin-bottom: 30px;
      }
      
      .progress-demo {
        margin-bottom: 15px;
      }
      
      .progress-demo span {
        display: block;
        margin-bottom: 8px;
        color: var(--text-normal);
      }
      
      .circular-grid {
        display: flex;
        gap: 30px;
        justify-content: center;
      }
      
      .spinner-container {
        text-align: center;
      }
      
      .spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--background-modifier-border);
        border-top: 4px solid var(--interactive-accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto 10px;
      }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .status-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }
      
      .status-item {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px;
      }
      
      .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      
      .status-online { background: #4caf50; }
      .status-offline { background: #757575; }
      .status-warning { background: #ff9800; }
      .status-error { background: #f44336; }
      
      .badge-grid {
        display: flex;
        gap: 15px;
        flex-wrap: wrap;
      }
      
      .badge-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .badge {
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 12px;
        font-weight: bold;
      }
      
      .badge-primary { background: var(--interactive-accent); color: white; }
      .badge-success { background: #4caf50; color: white; }
      .badge-warning { background: #ff9800; color: white; }
      .badge-dot { background: #f44336; color: white; border-radius: 50%; width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; }
      
      /* Interactive Elements */
      .interactive-group {
        margin-bottom: 30px;
        padding: 20px;
        background: var(--background-secondary);
        border-radius: 8px;
      }
      
      .slider-demo {
        margin-bottom: 15px;
      }
      
      .modern-slider {
        width: 100%;
        height: 6px;
        background: var(--background-modifier-border);
        border-radius: 3px;
        outline: none;
        margin-top: 10px;
      }
      
      .modern-slider::-webkit-slider-thumb {
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--interactive-accent);
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      }
      
      .star-rating {
        display: flex;
        gap: 5px;
        margin-top: 10px;
      }
      
      .star {
        font-size: 24px;
        cursor: pointer;
        transition: all 0.2s ease;
        filter: grayscale(100%);
      }
      
      .star.active {
        filter: grayscale(0%);
        transform: scale(1.1);
      }
      
      .accordion {
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .accordion-item {
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .accordion-header {
        padding: 15px 20px;
        background: var(--background-primary);
        cursor: pointer;
        transition: background 0.2s ease;
        position: relative;
      }
      
      .accordion-header::after {
        content: '▼';
        position: absolute;
        right: 20px;
        transition: transform 0.3s ease;
      }
      
      .accordion-item.active .accordion-header::after {
        transform: rotate(180deg);
      }
      
      .accordion-header:hover {
        background: var(--background-modifier-hover);
      }
      
      .accordion-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
        background: var(--background-secondary);
      }
      
      .accordion-item.active .accordion-content {
        max-height: 200px;
        padding: 15px 20px;
      }
      
      .tooltip-demo {
        position: relative;
        display: inline-block;
        margin-top: 10px;
      }
      
      .tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 8px 12px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        display: none;
        z-index: 1000;
      }
      
      .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 5px solid transparent;
        border-top-color: rgba(0, 0, 0, 0.8);
      }
      
      /* Theme Variants */
      .theme-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
      }
      
      .theme-demo {
        padding: 20px;
        border-radius: 12px;
        text-align: center;
      }
      
      .light-theme {
        background: #ffffff;
        color: #333333;
        border: 1px solid #e0e0e0;
      }
      
      .light-theme .theme-btn {
        background: #2196F3;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        margin: 10px 0;
      }
      
      .light-theme .theme-card {
        background: #f5f5f5;
        padding: 15px;
        border-radius: 8px;
        margin-top: 10px;
      }
      
      .dark-theme {
        background: #1a1a1a;
        color: #ffffff;
        border: 1px solid #333333;
      }
      
      .dark-theme .theme-btn {
        background: #bb86fc;
        color: black;
        border: none;
        padding: 10px 20px;
        border-radius: 6px;
        margin: 10px 0;
      }
      
      .dark-theme .theme-card {
        background: #2a2a2a;
        padding: 15px;
        border-radius: 8px;
        margin-top: 10px;
      }
      
      .neon-theme {
        background: #0a0a0a;
        color: #00ff88;
        border: 2px solid #00ff88;
        box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
      }
      
      .neon-theme .theme-btn {
        background: transparent;
        color: #00ff88;
        border: 2px solid #00ff88;
        padding: 10px 20px;
        border-radius: 6px;
        margin: 10px 0;
        text-shadow: 0 0 10px #00ff88;
      }
      
      .neon-theme .theme-card {
        background: rgba(0, 255, 136, 0.1);
        border: 1px solid #00ff88;
        padding: 15px;
        border-radius: 8px;
        margin-top: 10px;
      }
      
      .nature-theme {
        background: linear-gradient(135deg, #a8e6cf 0%, #dcedc8 100%);
        color: #2e7d32;
        border: 1px solid #81c784;
      }
      
      .nature-theme .theme-btn {
        background: #4caf50;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 20px;
        margin: 10px 0;
      }
      
      .nature-theme .theme-card {
        background: rgba(255, 255, 255, 0.7);
        padding: 15px;
        border-radius: 12px;
        margin-top: 10px;
        backdrop-filter: blur(10px);
      }
      
      /* Audio Visualizers */
      .audio-controls {
        margin-bottom: 25px;
        padding: 20px;
        background: var(--background-secondary);
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .audio-controls-grid {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        margin-bottom: 15px;
      }
      
      .color-controls {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 15px;
      }
      
      .audio-color-select {
        padding: 8px 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        color: var(--text-normal);
        font-size: 14px;
      }
      
      .audio-visualizers-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .audio-visualizer-container {
        background: linear-gradient(135deg, rgba(0, 0, 0, 0.8) 0%, rgba(20, 20, 40, 0.8) 100%);
        border-radius: 12px;
        padding: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(10px);
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        transition: all 0.3s ease;
      }
      
      .audio-visualizer-container:hover {
        transform: translateY(-2px);
        box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
        border-color: rgba(255, 255, 255, 0.2);
      }
      
      .audio-visualizer-container h4 {
        margin: 0 0 10px 0;
        color: var(--text-accent);
        font-size: 14px;
        text-align: center;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
      }
      
      .audio-canvas {
        width: 100%;
        height: 150px;
        border-radius: 8px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: block;
        box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
      }
      
      .showcase-section.audio-active {
        animation: audio-pulse 2s infinite ease-in-out;
      }
      
      @keyframes audio-pulse {
        0%, 100% { 
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        50% { 
          box-shadow: 0 0 40px rgba(0, 255, 136, 0.6);
        }
      }
      
      .audio-active .audio-visualizer-container {
        border-color: rgba(0, 255, 136, 0.5);
        animation: visualizer-glow 3s infinite ease-in-out;
      }
      
      @keyframes visualizer-glow {
        0%, 100% { 
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }
        50% { 
          box-shadow: 0 12px 40px rgba(0, 255, 136, 0.4);
        }
      }
      
      .audio-active .audio-canvas {
        border-color: rgba(0, 255, 136, 0.3);
        animation: canvas-glow 2s infinite ease-in-out;
      }
      
      @keyframes canvas-glow {
        0%, 100% { 
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5);
        }
        50% { 
          box-shadow: inset 0 2px 8px rgba(0, 0, 0, 0.5), 0 0 20px rgba(0, 255, 136, 0.3);
        }
      }
      
      /* Audio visualizer specific styles */
      .audio-visualizer-container:nth-child(1) { /* Waveform */
        border-left: 3px solid #00ff88;
      }
      
      .audio-visualizer-container:nth-child(2) { /* Frequency */
        border-left: 3px solid #ff6b6b;
      }
      
      .audio-visualizer-container:nth-child(3) { /* Circular */
        border-left: 3px solid #4ecdc4;
      }
      
      .audio-visualizer-container:nth-child(4) { /* VU Meters */
        border-left: 3px solid #45b7d1;
      }
      
      .audio-visualizer-container:nth-child(5) { /* Particles */
        border-left: 3px solid #f9ca24;
      }
      
      .audio-visualizer-container:nth-child(6) { /* 3D Cube */
        border-left: 3px solid #6c5ce7;
      }
      
      .audio-visualizer-container:nth-child(7) { /* Beat Detection */
        border-left: 3px solid #fd79a8;
      }
      
      .audio-visualizer-container:nth-child(8) { /* Spectrogram */
        border-left: 3px solid #00b894;
      }
      
      /* GIF and Animation Styles */
      .gif-category {
        margin-bottom: 30px;
      }
      
      .gif-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin-top: 15px;
      }
      
      .gif-demo-card {
        background: var(--background-secondary);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        border: 1px solid var(--background-modifier-border);
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }
      
      .gif-demo-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0,0,0,0.2);
        border-color: var(--interactive-accent);
      }
      
      .gif-demo-card h4 {
        margin: 0 0 15px 0;
        color: var(--text-accent);
        font-size: 14px;
      }
      
      /* CSS Loading Animations */
      .css-loading-spinner {
        width: 40px;
        height: 40px;
        border: 4px solid var(--background-modifier-border);
        border-top: 4px solid var(--interactive-accent);
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin: 0 auto;
      }
      
      .pulsing-dots {
        display: flex;
        justify-content: center;
        gap: 8px;
      }
      
      .pulsing-dots .dot {
        width: 12px;
        height: 12px;
        background: var(--interactive-accent);
        border-radius: 50%;
        animation: pulse-dot 1.5s infinite ease-in-out;
      }
      
      .pulsing-dots .dot:nth-child(2) {
        animation-delay: 0.3s;
      }
      
      .pulsing-dots .dot:nth-child(3) {
        animation-delay: 0.6s;
      }
      
      .wave-loader {
        display: flex;
        justify-content: center;
        align-items: end;
        gap: 4px;
        height: 40px;
      }
      
      .wave-bar {
        width: 6px;
        background: var(--interactive-accent);
        border-radius: 3px;
        animation: wave-bounce 1.2s infinite ease-in-out;
      }
      
      .wave-bar:nth-child(1) { animation-delay: 0s; }
      .wave-bar:nth-child(2) { animation-delay: 0.1s; }
      .wave-bar:nth-child(3) { animation-delay: 0.2s; }
      .wave-bar:nth-child(4) { animation-delay: 0.3s; }
      .wave-bar:nth-child(5) { animation-delay: 0.4s; }
      
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      @keyframes pulse-dot {
        0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
        40% { transform: scale(1.2); opacity: 1; }
      }
      
      @keyframes wave-bounce {
        0%, 40%, 100% { height: 10px; }
        20% { height: 30px; }
      }
      
      /* Celebration Animations */
      .confetti-container {
        position: relative;
        height: 60px;
        overflow: hidden;
      }
      
      .confetti-piece {
        position: absolute;
        width: 8px;
        height: 8px;
        background: var(--interactive-accent);
        animation: confetti-fall 2s infinite linear;
      }
      
      .confetti-piece:nth-child(odd) {
        background: #ff6b6b;
        border-radius: 50%;
      }
      
      .confetti-piece:nth-child(even) {
        background: #4ecdc4;
        transform: rotate(45deg);
      }
      
      @keyframes confetti-fall {
        0% { transform: translateY(-20px) rotate(0deg); }
        100% { transform: translateY(80px) rotate(360deg); }
      }
      
      .success-check {
        font-size: 48px;
        color: #4caf50;
        animation: success-bounce 1s ease-in-out infinite alternate;
      }
      
      @keyframes success-bounce {
        0% { transform: scale(1); }
        100% { transform: scale(1.1); }
      }
      
      .party-emoji {
        font-size: 48px;
        animation: party-spin 2s ease-in-out infinite;
      }
      
      @keyframes party-spin {
        0%, 100% { transform: rotate(0deg) scale(1); }
        25% { transform: rotate(15deg) scale(1.1); }
        75% { transform: rotate(-15deg) scale(1.1); }
      }
      
      /* Background Effects */
      .floating-bg {
        position: relative;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
      }
      
      .particle-bg {
        position: relative;
        height: 80px;
        overflow: hidden;
      }
      
      .floating-particle {
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(255, 255, 255, 0.6);
        border-radius: 50%;
        animation: float-up linear infinite;
      }
      
      @keyframes float-up {
        0% { transform: translateY(100px) translateX(0); opacity: 0; }
        10% { opacity: 1; }
        90% { opacity: 1; }
        100% { transform: translateY(-20px) translateX(20px); opacity: 0; }
      }
      
      .gradient-bg {
        background: linear-gradient(-45deg, #667eea, #764ba2, #f093fb, #f5576c);
        background-size: 400% 400%;
        animation: gradient-shift 4s ease infinite;
        color: white;
      }
      
      .gradient-content {
        padding: 20px 0;
        font-weight: bold;
      }
      
      .matrix-bg {
        background: #000;
        color: #00ff00;
        position: relative;
        overflow: hidden;
      }
      
      .matrix-container {
        position: relative;
        height: 80px;
      }
      
      .matrix-column {
        position: absolute;
        top: 0;
        width: 2px;
        height: 100%;
        background: linear-gradient(180deg, transparent 0%, #00ff00 50%, transparent 100%);
        animation: matrix-rain 3s linear infinite;
      }
      
      @keyframes matrix-rain {
        0% { transform: translateY(-100%); }
        100% { transform: translateY(200%); }
      }
      
      /* Interactive Animations */
      .hover-demo:hover .hover-content {
        animation: hover-bounce 0.6s ease-in-out;
      }
      
      @keyframes hover-bounce {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }
      
      .click-effect-btn {
        padding: 12px 24px;
        background: var(--interactive-accent);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .click-effect-btn.clicked {
        animation: click-pulse 0.6s ease-out;
      }
      
      @keyframes click-pulse {
        0% { transform: scale(1); }
        50% { transform: scale(1.2); box-shadow: 0 0 20px var(--interactive-accent); }
        100% { transform: scale(1); }
      }
      
      .typing-text {
        font-family: monospace;
        font-size: 16px;
        min-height: 20px;
        border-right: 2px solid var(--text-accent);
        animation: blink 1s infinite;
      }
      
      @keyframes blink {
        0%, 50% { border-color: var(--text-accent); }
        51%, 100% { border-color: transparent; }
      }
      
      /* GIF Placeholders */
      .gif-placeholder {
        width: 64px;
        height: 64px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto;
        font-size: 32px;
      }
      
      .spinner-gif {
        background: linear-gradient(135deg, #667eea, #764ba2);
        animation: spin 2s linear infinite;
      }
      
      .success-gif {
        background: linear-gradient(135deg, #4caf50, #45a049);
        animation: pulse 1.5s ease-in-out infinite;
      }
      
      .error-gif {
        background: linear-gradient(135deg, #f44336, #d32f2f);
        animation: shake 0.5s ease-in-out infinite alternate;
      }
      
      @keyframes shake {
        0% { transform: translateX(0); }
        100% { transform: translateX(4px); }
      }
      
      .code-example {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 20px;
        margin-top: 15px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .code-example pre {
        margin: 0;
        font-size: 12px;
        line-height: 1.4;
      }
      
      .code-example code {
        color: var(--text-muted);
      }
      
      /* Placement Styles */
      .placement-category {
        margin-bottom: 40px;
      }
      
      .placement-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
        margin-top: 20px;
      }
      
      .placement-demo {
        background: var(--background-secondary);
        border-radius: 12px;
        padding: 20px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .placement-demo.full-width {
        grid-column: 1 / -1;
      }
      
      .placement-demo h4 {
        margin: 0 0 15px 0;
        color: var(--text-accent);
        font-size: 14px;
      }
      
      /* Header Examples */
      .demo-header {
        background: var(--background-primary);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .custom-page-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: linear-gradient(90deg, var(--interactive-accent), var(--text-accent));
        color: white;
      }
      
      .header-icon {
        font-size: 20px;
        margin-right: 10px;
      }
      
      .header-title {
        flex: 1;
        font-weight: bold;
      }
      
      .header-actions {
        display: flex;
        gap: 8px;
      }
      
      .header-btn {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 10px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .header-btn:hover {
        background: rgba(255, 255, 255, 0.3);
      }
      
      .demo-title {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 12px;
      }
      
      .custom-title-area {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .title-prefix {
        font-size: 18px;
      }
      
      .title-text {
        flex: 1;
        font-weight: bold;
        color: var(--text-normal);
      }
      
      .title-suffix {
        display: flex;
        gap: 8px;
        align-items: center;
      }
      
      .word-count {
        font-size: 12px;
        color: var(--text-muted);
      }
      
      .status-badge {
        background: #4caf50;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        font-weight: bold;
      }
      
      /* Sidebar Examples */
      .demo-ribbon {
        display: flex;
        flex-direction: column;
        gap: 8px;
        width: fit-content;
        margin: 0 auto;
      }
      
      .ribbon-icon {
        width: 40px;
        height: 40px;
        background: var(--background-primary);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .ribbon-icon:hover {
        background: var(--interactive-accent);
        transform: scale(1.1);
      }
      
      .demo-sidebar-panel {
        background: var(--background-primary);
        border-radius: 8px;
        overflow: hidden;
      }
      
      .panel-header {
        background: var(--interactive-accent);
        color: white;
        padding: 12px 16px;
        font-weight: bold;
      }
      
      .panel-content {
        padding: 8px 0;
      }
      
      .panel-item {
        padding: 8px 16px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .panel-item:hover {
        background: var(--background-modifier-hover);
      }
      
      /* Status Examples */
      .demo-status-bar {
        display: flex;
        gap: 12px;
        background: var(--background-primary);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
      }
      
      .status-item {
        color: var(--text-muted);
      }
      
      .demo-toast-container {
        position: relative;
        min-height: 60px;
      }
      
      .demo-toast {
        position: absolute;
        top: 10px;
        right: 10px;
        background: #4caf50;
        color: white;
        padding: 12px 16px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        animation: toast-slide-in 0.3s ease-out;
      }
      
      @keyframes toast-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      
      /* Modal Examples */
      .demo-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        animation: fade-in 0.2s ease-out;
      }
      
      .demo-modal {
        background: var(--background-primary);
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        animation: modal-slide-up 0.3s ease-out;
      }
      
      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid var(--background-modifier-border);
      }
      
      .modal-header h3 {
        margin: 0;
        color: var(--text-normal);
      }
      
      .modal-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: var(--text-muted);
        padding: 4px;
      }
      
      .modal-close:hover {
        color: var(--text-normal);
      }
      
      .modal-body {
        padding: 20px;
      }
      
      .modal-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
        justify-content: flex-end;
      }
      
      @keyframes fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes modal-slide-up {
        from { transform: translateY(50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      
      /* Command Palette Examples */
      .demo-command-palette {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 8px;
      }
      
      .command-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 12px;
        border-radius: 4px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .command-item:hover {
        background: var(--background-modifier-hover);
      }
      
      .command-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }
      
      .command-name {
        flex: 1;
        color: var(--text-normal);
      }
      
      .command-hotkey {
        font-size: 12px;
        color: var(--text-muted);
        background: var(--background-secondary);
        padding: 2px 6px;
        border-radius: 3px;
      }
      
      /* Context Menu Examples */
      .demo-context-menu {
        position: fixed;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
        padding: 4px;
        z-index: 10000;
        min-width: 150px;
        animation: context-menu-appear 0.15s ease-out;
      }
      
      .context-item {
        padding: 8px 12px;
        cursor: pointer;
        border-radius: 4px;
        font-size: 14px;
        transition: background 0.2s ease;
      }
      
      .context-item:hover {
        background: var(--background-modifier-hover);
      }
      
      .context-separator {
        height: 1px;
        background: var(--background-modifier-border);
        margin: 4px 0;
      }
      
      @keyframes context-menu-appear {
        from { opacity: 0; transform: scale(0.9); }
        to { opacity: 1; transform: scale(1); }
      }
      
      /* Tips Grid */
      .tips-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 15px;
        margin-top: 20px;
      }
      
      .tip-card {
        background: var(--background-primary);
        border-radius: 8px;
        padding: 15px;
        border: 1px solid var(--background-modifier-border);
      }
      
      .tip-card h4 {
        margin: 0 0 10px 0;
        color: var(--text-accent);
        font-size: 13px;
      }
      
      .tip-card pre {
        background: var(--background-secondary);
        padding: 10px;
        border-radius: 4px;
        font-size: 11px;
        line-height: 1.3;
        margin: 0;
        overflow-x: auto;
      }
      
      /* Responsive */
      @media (max-width: 768px) {
        .ui-showcase-nav {
          flex-direction: column;
        }
        
        .cards-grid,
        .animation-grid {
          grid-template-columns: 1fr;
        }
        
        .theme-grid {
          grid-template-columns: 1fr;
        }
        
        .sidebar-demo {
          flex-direction: column;
          height: auto;
        }
        
        .demo-sidebar {
          width: 100%;
        }
        
        .audio-visualizers-grid {
          grid-template-columns: 1fr;
        }
        
        .audio-controls-grid {
          flex-direction: column;
          align-items: stretch;
        }
        
        .color-controls {
          flex-direction: column;
        }
        
        .gif-grid {
          grid-template-columns: 1fr;
        }
        
        .placement-grid {
          grid-template-columns: 1fr;
        }
        
        .tips-grid {
          grid-template-columns: 1fr;
        }
      }

      /* Particle Demo Styles */
      .particle-demo {
        width: 100%;
        height: 200px;
        border: 2px solid var(--interactive-normal);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        margin: 10px 0;
        cursor: crosshair;
      }

      .rain-effect {
        background: linear-gradient(180deg, #2c3e50 0%, #3498db 100%);
      }

      .follow-effect {
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%);
      }

      .bubble-effect {
        background: linear-gradient(180deg, #e3f2fd 0%, #90caf9 100%);
      }

      .magnet-effect {
        background: linear-gradient(135deg, #000 0%, #1a1a2e 100%);
      }

      .fire-effect {
        background: linear-gradient(180deg, #2c1810 0%, #000 100%);
      }

      .particle-demo canvas {
        display: block;
        width: 100%;
        height: 100%;
      }

      .particle-demo:hover {
        border-color: var(--interactive-hover);
        box-shadow: 0 4px 20px rgba(74, 158, 255, 0.3);
        transition: all 0.3s ease;
      }

      /* Geometry Demo Styles */
      .geometry-demo {
        width: 100%;
        height: 200px;
        border: 2px solid var(--interactive-normal);
        border-radius: 12px;
        position: relative;
        overflow: hidden;
        background: linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%);
        margin: 10px 0;
        cursor: crosshair;
      }

      .mandala-effect {
        background: radial-gradient(circle, #2c1810 0%, #0a0a0a 100%);
      }

      .sierpinski-effect {
        background: linear-gradient(135deg, #001122 0%, #000000 100%);
      }

      .flower-effect {
        background: radial-gradient(circle, #1a1a2e 0%, #000011 100%);
      }

      .julia-effect {
        background: linear-gradient(45deg, #000033 0%, #001122 50%, #000000 100%);
      }

      .kaleido-effect {
        background: conic-gradient(from 0deg, #000 0%, #1a1a2e 25%, #2c2c54 50%, #1a1a2e 75%, #000 100%);
      }

      .geometry-demo canvas {
        display: block;
        width: 100%;
        height: 100%;
        opacity: 0.9;
      }

      .geometry-demo:hover {
        border-color: var(--interactive-hover);
        box-shadow: 0 6px 25px rgba(255, 215, 0, 0.4);
        transform: translateY(-2px);
        transition: all 0.3s ease;
      }

      .geometry-demo:hover canvas {
        opacity: 1;
      }

      /* Sprite and GIF Demo Styles */
      .sprite-demo, .gif-demo, .progress-demo, .icon-demo, .card-flip-demo {
        border: 2px solid var(--interactive-normal);
        border-radius: 8px;
        padding: 20px;
        margin: 10px 0;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      }

      .sprite-character {
        width: 64px;
        height: 64px;
        margin: 20px auto;
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        border-radius: 8px;
        position: relative;
        overflow: hidden;
      }

      /* Sprite Character Animations using CSS transforms and pseudo-elements */
      .sprite-character::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 40px;
        height: 40px;
        background: #fff;
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: all 0.3s ease;
      }

      .sprite-character::after {
        content: '👤';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 24px;
        transition: all 0.3s ease;
      }

      .idle-animation::after {
        animation: idle 2s ease-in-out infinite;
      }

      .walk-animation::after {
        animation: walk 1s ease-in-out infinite;
      }

      .run-animation::after {
        animation: run 0.5s ease-in-out infinite;
      }

      .jump-animation::after {
        animation: jump 1s ease-in-out;
      }

      @keyframes idle {
        0%, 100% { transform: translate(-50%, -50%) scale(1); }
        50% { transform: translate(-50%, -50%) scale(1.05); }
      }

      @keyframes walk {
        0%, 100% { transform: translate(-50%, -50%) translateX(0); }
        25% { transform: translate(-50%, -50%) translateX(-2px); }
        75% { transform: translate(-50%, -50%) translateX(2px); }
      }

      @keyframes run {
        0%, 100% { transform: translate(-50%, -50%) translateX(0); }
        25% { transform: translate(-50%, -50%) translateX(-4px); }
        75% { transform: translate(-50%, -50%) translateX(4px); }
      }

      @keyframes jump {
        0%, 100% { transform: translate(-50%, -50%) translateY(0); }
        50% { transform: translate(-50%, -50%) translateY(-20px); }
      }

      .sprite-controls, .gif-controls, .progress-controls, .icon-controls {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
        margin-top: 15px;
      }

      .sprite-btn, .gif-btn, .progress-btn, .icon-btn, .flip-btn {
        padding: 8px 16px;
        border: 2px solid var(--interactive-normal);
        background: transparent;
        color: var(--text-normal);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .sprite-btn:hover, .gif-btn:hover, .progress-btn:hover, .icon-btn:hover, .flip-btn:hover {
        border-color: var(--interactive-hover);
        background: var(--interactive-hover);
        color: var(--text-on-accent);
      }

      .sprite-btn.active, .gif-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      /* GIF Display Area */
      .gif-player {
        width: 100%;
        height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px dashed var(--interactive-normal);
        border-radius: 8px;
        margin: 15px 0;
        background: rgba(0, 0, 0, 0.3);
      }

      .gif-display {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 32px;
        transition: all 0.3s ease;
      }

      .loading-gif {
        background: linear-gradient(45deg, #3498db, #2980b9);
        animation: loading 1s linear infinite;
      }

      .loading-gif::after {
        content: '⏳';
        animation: spin 1s linear infinite;
      }

      .success-gif {
        background: linear-gradient(45deg, #2ecc71, #27ae60);
        animation: success 0.6s ease-in-out;
      }

      .success-gif::after {
        content: '✅';
        animation: bounce 0.6s ease-in-out;
      }

      .error-gif {
        background: linear-gradient(45deg, #e74c3c, #c0392b);
        animation: error 0.5s ease-in-out;
      }

      .error-gif::after {
        content: '❌';
        animation: shake 0.5s ease-in-out;
      }

      .celebrate-gif {
        background: linear-gradient(45deg, #f39c12, #e67e22);
        animation: celebrate 1s ease-in-out infinite;
      }

      .celebrate-gif::after {
        content: '🎉';
        animation: bounce 0.8s ease-in-out infinite;
      }

      @keyframes loading {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      @keyframes success {
        0% { transform: scale(0.8); }
        50% { transform: scale(1.2); }
        100% { transform: scale(1); }
      }

      @keyframes bounce {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-10px); }
      }

      @keyframes error {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
      }

      @keyframes shake {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-5deg); }
        75% { transform: rotate(5deg); }
      }

      @keyframes celebrate {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.1); }
      }

      /* Progress Bar Styles */
      .progress-bar {
        width: 100%;
        height: 20px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
        overflow: hidden;
        margin: 15px 0;
        position: relative;
      }

      .progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3498db, #2ecc71);
        width: 0%;
        border-radius: 10px;
        transition: width 0.1s ease;
        position: relative;
      }

      .progress-sprite {
        position: absolute;
        right: -10px;
        top: 50%;
        width: 30px;
        height: 30px;
        transform: translateY(-50%);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        background: #fff;
        color: #333;
      }

      .progress-starting::after { content: '🚀'; }
      .progress-working::after { content: '⚙️'; animation: spin 2s linear infinite; }
      .progress-finishing::after { content: '🏁'; }
      .progress-complete::after { content: '✨'; animation: bounce 1s ease-in-out infinite; }

      /* Status Icons */
      .status-icon-group {
        display: flex;
        align-items: center;
        gap: 10px;
        margin: 10px 0;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
      }

      .status-icon {
        width: 24px;
        height: 24px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .connection-icon.online {
        background: #2ecc71;
        animation: pulse 2s ease-in-out infinite;
      }

      .connection-icon.online::after { content: '📶'; }

      .connection-icon.offline {
        background: #e74c3c;
      }

      .connection-icon.offline::after { content: '📵'; }

      .battery-icon.full {
        background: #2ecc71;
      }

      .battery-icon.full::after { content: '🔋'; }

      .battery-icon.high {
        background: #f39c12;
      }

      .battery-icon.high::after { content: '🔋'; }

      .battery-icon.medium {
        background: #e67e22;
      }

      .battery-icon.medium::after { content: '🪫'; }

      .battery-icon.low {
        background: #e74c3c;
        animation: blink 1s ease-in-out infinite;
      }

      .battery-icon.low::after { content: '🪫'; }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      @keyframes blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.3; }
      }

      .status-label {
        font-weight: 500;
        color: var(--text-normal);
      }

      /* Card Flip Animation */
      .flip-card {
        width: 200px;
        height: 120px;
        margin: 20px auto;
        perspective: 1000px;
      }

      .flip-card.flipped .card-face {
        transform: rotateY(180deg);
      }

      .card-face {
        width: 100%;
        height: 100%;
        position: absolute;
        border-radius: 12px;
        transition: transform 0.6s ease;
        transform-style: preserve-3d;
        backface-visibility: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        font-weight: bold;
        color: white;
        text-shadow: 0 2px 4px rgba(0,0,0,0.5);
      }

      .card-front {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }

      .card-front::after { content: '🎴 FRONT'; }

      .card-back {
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        transform: rotateY(180deg);
      }

      .card-back::after { content: '🎭 BACK'; }

      .flip-btn {
        display: block;
        margin: 20px auto 0;
        padding: 12px 24px;
        background: linear-gradient(45deg, #667eea, #764ba2);
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.3s ease;
      }

      .flip-btn:hover {
        background: linear-gradient(45deg, #764ba2, #667eea);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }

      /* Dropdown/Accordion Base Styles */
      .dropdown-container {
        margin: 15px 0;
        min-height: 60px;
        border-radius: 12px;
        transition: all 0.3s ease;
        position: relative;
      }

      .dropdown {
        border-radius: 12px;
        overflow: hidden;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        transition: all 0.3s ease;
        margin-bottom: 10px;
      }

      .dropdown-header {
        padding: 16px 20px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 12px;
        transition: all 0.3s ease;
        user-select: none;
        position: relative;
      }

      .dropdown-header:hover {
        transform: translateY(-1px);
      }

      .drag-handle, .item-drag-handle {
        cursor: grab;
        opacity: 0.6;
        font-size: 12px;
        transition: opacity 0.2s ease;
      }

      .drag-handle:hover, .item-drag-handle:hover {
        opacity: 1;
      }

      .dropdown-title {
        flex: 1;
        font-weight: 600;
        font-size: 16px;
      }

      .dropdown-arrow {
        font-size: 12px;
        transition: transform 0.3s ease;
      }

      .dropdown.open .dropdown-arrow {
        transform: rotate(180deg);
      }

      .dropdown-content {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      .dropdown.open .dropdown-content {
        max-height: 500px; /* Fallback for compatibility */
      }

      .dropdown-items {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .dropdown-item {
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      }

      .dropdown-item:last-child {
        border-bottom: none;
      }

      .item-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }

      .item-text {
        flex: 1;
      }

      /* Drag and Drop Indicators */
      .dropdown-over {
        outline: 2px dashed var(--interactive-accent);
        outline-offset: 4px;
      }

      .drop-indicator {
        height: 2px;
        background: var(--interactive-accent);
        margin: 4px 0;
        border-radius: 1px;
        opacity: 0.8;
      }

      .dragging {
        opacity: 0.5;
        transform: scale(0.95);
      }

      /* Glass Morphism Style */
      .glass-style .dropdown {
        background: rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .glass-dropdown .dropdown-header {
        background: rgba(255, 255, 255, 0.05);
        color: #ffffff;
      }

      .glass-dropdown .dropdown-header:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .glass-dropdown .dropdown-item:hover {
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
      }

      /* Neon Cyberpunk Style */
      .neon-style .dropdown {
        background: linear-gradient(145deg, #0a0a0a, #1a1a2e);
        border: 2px solid #00ffff;
        box-shadow: 0 0 20px rgba(0, 255, 255, 0.3), inset 0 0 20px rgba(0, 255, 255, 0.1);
      }

      .neon-dropdown .dropdown-header {
        background: linear-gradient(90deg, #ff0080, #00ffff);
        background-clip: text;
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        position: relative;
      }

      .neon-dropdown .dropdown-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: linear-gradient(90deg, rgba(255, 0, 128, 0.1), rgba(0, 255, 255, 0.1));
        z-index: -1;
      }

      .neon-dropdown .dropdown-header:hover::before {
        background: linear-gradient(90deg, rgba(255, 0, 128, 0.2), rgba(0, 255, 255, 0.2));
      }

      .neon-dropdown .dropdown-item {
        color: #00ffff;
      }

      .neon-dropdown .dropdown-item:hover {
        background: linear-gradient(90deg, rgba(255, 0, 128, 0.1), rgba(0, 255, 255, 0.1));
        color: #ff0080;
        text-shadow: 0 0 10px currentColor;
      }

      /* Natural Wood Style */
      .wood-style .dropdown {
        background: linear-gradient(145deg, #8B4513, #A0522D);
        border: 3px solid #654321;
        box-shadow: 0 8px 16px rgba(101, 67, 33, 0.3);
      }

      .wood-dropdown .dropdown-header {
        background: linear-gradient(90deg, #CD853F, #D2B48C);
        color: #2F1B14;
        text-shadow: 1px 1px 2px rgba(210, 180, 140, 0.3);
      }

      .wood-dropdown .dropdown-header:hover {
        background: linear-gradient(90deg, #D2B48C, #CD853F);
      }

      .wood-dropdown .dropdown-item {
        color: #F5DEB3;
        background: rgba(210, 180, 140, 0.1);
      }

      .wood-dropdown .dropdown-item:hover {
        background: rgba(205, 133, 63, 0.2);
        color: #FFFFFF;
      }

      /* Paper Minimalist Style */
      .paper-style .dropdown {
        background: #FAFAFA;
        border: 1px solid #E0E0E0;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }

      .paper-dropdown .dropdown-header {
        background: #FFFFFF;
        color: #333333;
        border-bottom: 1px solid #E0E0E0;
        font-family: 'Georgia', serif;
      }

      .paper-dropdown .dropdown-header:hover {
        background: #F5F5F5;
      }

      .paper-dropdown .dropdown-item {
        color: #555555;
        font-family: 'Georgia', serif;
        border-bottom: 1px solid #F0F0F0;
      }

      .paper-dropdown .dropdown-item:hover {
        background: #F9F9F9;
        color: #333333;
      }

      /* Terminal Hacker Style */
      .terminal-style .dropdown {
        background: #000000;
        border: 2px solid #00FF00;
        box-shadow: 0 0 10px rgba(0, 255, 0, 0.3);
        font-family: 'Courier New', monospace;
      }

      .terminal-dropdown .dropdown-header {
        background: #001100;
        color: #00FF00;
        font-weight: bold;
        text-shadow: 0 0 5px #00FF00;
      }

      .terminal-dropdown .dropdown-header::before {
        content: '> ';
        color: #00FF00;
      }

      .terminal-dropdown .dropdown-header:hover {
        background: #002200;
        text-shadow: 0 0 8px #00FF00;
      }

      .terminal-dropdown .dropdown-item {
        color: #00CC00;
        font-family: 'Courier New', monospace;
      }

      .terminal-dropdown .dropdown-item::before {
        content: '$ ';
        color: #00FF00;
      }

      .terminal-dropdown .dropdown-item:hover {
        background: #001100;
        color: #00FF00;
        text-shadow: 0 0 5px #00FF00;
      }

      /* Responsive Design */
      @media (max-width: 768px) {
        .dropdown-header {
          padding: 12px 16px;
        }

        .dropdown-item {
          padding: 10px 16px;
        }

        .dropdown-title {
          font-size: 14px;
        }
      }

      /* Charts Styles */
      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
        margin: 20px 0;
      }

      .chart-demo {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 20px;
        text-align: center;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .chart-demo:hover {
        transform: translateY(-2px);
        box-shadow: 0 10px 25px rgba(0,0,0,0.1);
        border-color: var(--interactive-accent);
      }

      .chart-demo h3 {
        margin: 0 0 15px 0;
        color: var(--text-normal);
        font-weight: 600;
      }

      .chart-canvas {
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        cursor: crosshair;
        transition: all 0.3s ease;
        max-width: 100%;
        height: auto;
      }

      .chart-canvas:hover {
        border-color: var(--interactive-accent);
        box-shadow: 0 0 15px rgba(var(--interactive-accent-rgb), 0.3);
      }

      .chart-controls {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        padding: 20px;
        margin: 30px 0;
      }

      .chart-controls h3 {
        margin: 0 0 15px 0;
        color: var(--text-normal);
        text-align: center;
      }

      .controls-group {
        display: flex;
        gap: 10px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .controls-group button {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
      }

      .controls-group button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      }

      @media (max-width: 768px) {
        .charts-grid {
          grid-template-columns: 1fr;
          gap: 15px;
        }
        
        .chart-demo {
          padding: 15px;
        }
        
        .chart-canvas {
          width: 100%;
          height: auto;
        }
        
        .controls-group {
          flex-direction: column;
          align-items: center;
        }
        
        .controls-group button {
          width: 200px;
        }
      }

      /* Radial Charts Gallery Styles */
      .radial-gallery-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
        gap: 25px;
        margin: 25px 0;
      }

      .radial-chart-demo {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 16px;
        padding: 25px;
        text-align: center;
        transition: all 0.4s ease;
        position: relative;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      }

      .radial-chart-demo.featured {
        grid-column: span 1;
        background: linear-gradient(135deg, var(--background-secondary) 0%, var(--background-primary) 100%);
        border: 2px solid var(--interactive-accent);
      }

      .radial-chart-demo:hover {
        transform: translateY(-4px);
        box-shadow: 0 12px 30px rgba(0,0,0,0.15);
        border-color: var(--interactive-accent);
      }

      .radial-chart-demo h3 {
        margin: 0 0 8px 0;
        color: var(--text-normal);
        font-weight: 700;
        font-size: 16px;
      }

      .radial-chart-demo p {
        margin: 0 0 20px 0;
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.4;
      }

      .radial-canvas {
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        background: var(--background-primary);
        cursor: pointer;
        transition: all 0.4s ease;
        max-width: 100%;
        height: auto;
        box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);
      }

      .radial-canvas:hover {
        border-color: var(--interactive-accent);
        box-shadow: 0 0 20px rgba(var(--interactive-accent-rgb), 0.4);
        transform: scale(1.02);
      }

      .radial-controls {
        background: linear-gradient(135deg, var(--background-secondary) 0%, var(--background-primary) 100%);
        border: 2px solid var(--interactive-accent);
        border-radius: 16px;
        padding: 25px;
        margin: 40px 0;
        box-shadow: 0 8px 25px rgba(0,0,0,0.1);
      }

      .radial-controls h3 {
        margin: 0 0 20px 0;
        color: var(--text-normal);
        text-align: center;
        font-weight: 700;
        font-size: 18px;
      }

      .radial-controls-group {
        display: flex;
        gap: 15px;
        justify-content: center;
        flex-wrap: wrap;
      }

      .radial-controls-group button {
        padding: 12px 24px;
        border-radius: 10px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 14px;
        min-width: 140px;
        position: relative;
        overflow: hidden;
      }

      .radial-controls-group button::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
        transition: left 0.5s;
      }

      .radial-controls-group button:hover::before {
        left: 100%;
      }

      .radial-controls-group button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(0,0,0,0.3);
      }

      .radial-controls-group .btn-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }

      @media (max-width: 768px) {
        .radial-gallery-grid {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .radial-chart-demo {
          padding: 20px;
        }

        .radial-chart-demo.featured {
          grid-column: span 1;
        }
        
        .radial-canvas {
          width: 100%;
          height: auto;
        }
        
        .radial-controls-group {
          flex-direction: column;
          align-items: center;
        }
        
        .radial-controls-group button {
          width: 240px;
        }
      }

      @media (min-width: 1200px) {
        .radial-gallery-grid {
          grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
        }
        
        .radial-chart-demo.featured {
          grid-column: span 1;
        }
      }

      /* Developer Panel Styles */
      .dev-panel {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        margin: 25px 0;
        min-height: 600px;
      }

      .chat-section, .console-section {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 16px;
        padding: 20px;
        display: flex;
        flex-direction: column;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      }

      .section-title {
        margin: 0 0 15px 0;
        color: var(--text-normal);
        font-weight: 700;
        font-size: 16px;
        border-bottom: 2px solid var(--interactive-accent);
        padding-bottom: 8px;
      }

      .chat-controls {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 20px;
        padding: 15px;
        background: var(--background-primary);
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
      }

      .control-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .control-group.compact {
        flex: 1;
      }

      .control-group label {
        font-weight: 600;
        color: var(--text-normal);
        font-size: 13px;
        min-width: 80px;
      }

      .dev-select {
        padding: 6px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .dev-select:hover {
        border-color: var(--interactive-accent);
      }

      .dev-toggle {
        padding: 8px 16px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        background: var(--background-primary);
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        position: relative;
        overflow: hidden;
      }

      .dev-toggle:hover {
        border-color: var(--interactive-accent);
        transform: translateY(-1px);
      }

      .dev-toggle.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
      }

      .audio-controls-row {
        display: flex;
        gap: 10px;
        align-items: center;
        flex-wrap: wrap;
      }

      /* TTS Circular Visualizer */
      .tts-visualizer-container {
        position: relative;
        width: 60px;
        height: 60px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 50%;
        border: 2px solid var(--background-modifier-border);
        background: var(--background-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .tts-visualizer-container:hover {
        border-color: var(--interactive-accent);
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(var(--interactive-accent-rgb), 0.2);
      }

      .tts-visualizer-container.active {
        border-color: var(--interactive-accent);
        background: rgba(var(--interactive-accent-rgb), 0.1);
        box-shadow: 0 0 20px rgba(var(--interactive-accent-rgb), 0.3);
      }

      .tts-visualizer-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
      }

      .tts-emoji {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 20px;
        z-index: 2;
        pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.2s ease;
      }

      .tts-visualizer-container.active .tts-emoji {
        animation: pulse-lips 0.6s ease-in-out infinite alternate;
      }

      @keyframes pulse-lips {
        from { 
          transform: translate(-50%, -50%) scale(1);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        to { 
          transform: translate(-50%, -50%) scale(1.1);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) 
                  drop-shadow(0 0 10px rgba(var(--interactive-accent-rgb), 0.4));
        }
      }

      /* STT Circular Visualizer (similar to TTS but turquoise) */
      .stt-visualizer-container {
        position: relative;
        width: 60px;
        height: 60px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 50%;
        border: 2px solid var(--background-modifier-border);
        background: var(--background-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .stt-visualizer-container:hover {
        border-color: #20b2aa;
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(32, 178, 170, 0.2);
      }

      .stt-visualizer-container.active {
        border-color: #20b2aa;
        background: rgba(32, 178, 170, 0.1);
        box-shadow: 0 0 20px rgba(32, 178, 170, 0.3);
      }

      .stt-visualizer-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
      }

      .stt-emoji {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 20px;
        z-index: 2;
        pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.2s ease;
      }

      .stt-visualizer-container.active .stt-emoji {
        animation: pulse-mic 0.6s ease-in-out infinite alternate;
      }

      @keyframes pulse-mic {
        from { 
          transform: translate(-50%, -50%) scale(1);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        to { 
          transform: translate(-50%, -50%) scale(1.1);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) 
                  drop-shadow(0 0 10px rgba(32, 178, 170, 0.4));
        }
      }

      /* Wake Word Visualizer (purple/blue theme) */
      .wake-visualizer-container {
        position: relative;
        width: 60px;
        height: 60px;
        cursor: pointer;
        transition: all 0.3s ease;
        border-radius: 50%;
        border: 2px solid var(--background-modifier-border);
        background: var(--background-secondary);
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .wake-visualizer-container:hover {
        border-color: #805ad5;
        transform: scale(1.05);
        box-shadow: 0 4px 15px rgba(128, 90, 213, 0.2);
      }

      .wake-visualizer-container.active {
        border-color: #805ad5;
        background: rgba(128, 90, 213, 0.1);
        box-shadow: 0 0 20px rgba(128, 90, 213, 0.3);
      }

      .wake-visualizer-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
      }

      .wake-emoji {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 20px;
        z-index: 2;
        pointer-events: none;
        filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        transition: all 0.2s ease;
      }

      .wake-visualizer-container.active .wake-emoji {
        animation: pulse-hand 0.6s ease-in-out infinite alternate;
      }

      @keyframes pulse-hand {
        from { 
          transform: translate(-50%, -50%) scale(1);
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }
        to { 
          transform: translate(-50%, -50%) scale(1.1);
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)) 
                  drop-shadow(0 0 10px rgba(128, 90, 213, 0.4));
        }
      }

      .chat-window {
        flex: 1;
        background: var(--background-primary);
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      .audio-visualizer-container {
        padding: 10px;
        background: linear-gradient(135deg, var(--background-secondary) 0%, var(--background-primary) 100%);
        border-bottom: 1px solid var(--background-modifier-border);
        text-align: center;
      }

      .audio-visualizer-container.hidden {
        display: none;
      }

      .audio-viz-canvas {
        border-radius: 8px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
      }

      .chat-messages {
        flex: 1;
        padding: 15px;
        overflow-y: auto;
        max-height: 400px;
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb-bg) var(--scrollbar-bg);
      }

      .chat-message {
        margin-bottom: 20px;
        padding: 15px;
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
        position: relative;
        animation: fadeInUp 0.4s ease;
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .user-message {
        background: linear-gradient(135deg, var(--interactive-accent) 0%, var(--interactive-accent-hover) 100%);
        color: var(--text-on-accent);
        border-color: var(--interactive-accent);
        margin-left: 40px;
      }

      .ai-message {
        background: var(--background-secondary);
        border-color: var(--background-modifier-border-hover);
        margin-right: 40px;
      }

      .message-header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        font-size: 12px;
      }

      .message-icon {
        font-size: 16px;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: var(--background-primary);
      }

      .sender-label {
        font-weight: 700;
        color: var(--text-normal);
      }

      .timestamp {
        color: var(--text-muted);
        margin-left: auto;
        font-size: 11px;
      }

      .thinking-section {
        margin: 10px 0;
        padding: 12px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        border-left: 4px solid var(--interactive-accent);
      }

      .thinking-section.hidden {
        display: none;
      }

      .thinking-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 8px;
        font-weight: 600;
        color: var(--text-normal);
        font-size: 13px;
      }

      .thinking-toggle-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: var(--text-muted);
        font-weight: bold;
        padding: 2px 6px;
        border-radius: 4px;
        transition: background 0.2s ease;
      }

      .thinking-toggle-btn:hover {
        background: var(--background-modifier-hover);
      }

      .thinking-content {
        color: var(--text-muted);
        font-size: 13px;
        line-height: 1.5;
        font-style: italic;
      }

      .message-content {
        line-height: 1.6;
        font-size: 14px;
      }

      .message-content.typing {
        overflow: hidden;
        border-right: 2px solid var(--interactive-accent);
        animation: typing 2s steps(40) 1s forwards, blink-caret 0.75s step-end infinite;
      }

      @keyframes typing {
        from { width: 0; }
        to { width: 100%; }
      }

      @keyframes blink-caret {
        from, to { border-color: transparent; }
        50% { border-color: var(--interactive-accent); }
      }

      .message-content .bullet {
        color: var(--interactive-accent);
        font-weight: bold;
      }

      .message-content strong {
        font-weight: 700;
        color: var(--text-normal);
      }

      .message-content em {
        font-style: italic;
        color: var(--text-accent);
      }

      /* Color Schemes */
      .ocean-scheme.user-message {
        background: linear-gradient(135deg, #0077be 0%, #00a8cc 100%);
      }

      .ocean-scheme.ai-message {
        background: linear-gradient(135deg, #e0f2fe 0%, #b3e5fc 100%);
        color: #0c4a6e;
      }

      .sunset-scheme.user-message {
        background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      }

      .sunset-scheme.ai-message {
        background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
        color: #9a3412;
      }

      .forest-scheme.user-message {
        background: linear-gradient(135deg, #166534 0%, #16a34a 100%);
      }

      .forest-scheme.ai-message {
        background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
        color: #14532d;
      }

      .cyberpunk-scheme.user-message {
        background: linear-gradient(135deg, #ff2a6d 0%, #01b4ff 100%);
      }

      .cyberpunk-scheme.ai-message {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #00ff88;
        border-color: #ff2a6d;
      }

      .monochrome-scheme.user-message {
        background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
      }

      .monochrome-scheme.ai-message {
        background: linear-gradient(135deg, #f9fafb 0%, #e5e7eb 100%);
        color: #111827;
      }

      .console-window {
        flex: 1;
        background: #0a0a0a;
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
        overflow: hidden;
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
      }

      .console-output {
        padding: 15px;
        height: 400px;
        overflow-y: auto;
        font-size: 12px;
        line-height: 1.4;
        scrollbar-width: thin;
        scrollbar-color: #333 #0a0a0a;
      }

      .console-entry {
        margin-bottom: 2px;
        display: flex;
        gap: 8px;
      }

      .log-time {
        color: #6b7280;
        font-weight: 500;
      }

      .log-type {
        font-weight: 700;
        min-width: 100px;
      }

      .system-log .log-type { color: #10b981; }
      .info-log .log-type { color: #3b82f6; }
      .user_message-log .log-type { color: #f59e0b; }
      .ai_response-log .log-type { color: #8b5cf6; }
      .color_scheme-log .log-type { color: #ef4444; }
      .thinking_toggle-log .log-type { color: #06b6d4; }
      .tts_toggle-log .log-type { color: #84cc16; }
      .stt_toggle-log .log-type { color: #f97316; }
      .wake_word-log .log-type { color: #ec4899; }
      .visualizer-log .log-type { color: #6366f1; }
      .sample_load-log .log-type { color: #14b8a6; }
      .console-log .log-type { color: #64748b; }
      .export-log .log-type { color: #22c55e; }
      .perf-log .log-type { color: #a855f7; }

      .log-message {
        color: #e5e7eb;
        flex: 1;
      }

      .console-controls {
        display: flex;
        gap: 10px;
        margin-top: 15px;
      }

      .advanced-features {
        margin-top: 20px;
        padding: 20px;
        background: var(--background-primary);
        border-radius: 12px;
        border: 1px solid var(--background-modifier-border);
      }

      .feature-title {
        margin: 0 0 15px 0;
        color: var(--text-normal);
        font-weight: 700;
        font-size: 14px;
        border-bottom: 1px solid var(--background-modifier-border);
        padding-bottom: 8px;
      }

      .features-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
      }

      .feature-demo {
        background: var(--background-secondary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 8px;
        padding: 15px;
        transition: all 0.2s ease;
      }

      .feature-demo:hover {
        border-color: var(--interactive-accent);
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .feature-demo h5 {
        margin: 0 0 10px 0;
        color: var(--text-normal);
        font-size: 12px;
        font-weight: 600;
      }

      .demo-button {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .demo-button:hover {
        background: var(--interactive-hover);
        border-color: var(--interactive-accent);
      }

      .demo-button:active {
        transform: translateY(1px);
        background: var(--interactive-active);
      }

      /* Advanced feature log colors */
      .file_ops-log .log-type { color: #10b981; }
      .settings-log .log-type { color: #f59e0b; }
      .workspace-log .log-type { color: #3b82f6; }
      .vault-log .log-type { color: #8b5cf6; }
      .ai_system-log .log-type { color: #ef4444; }
      .memory-log .log-type { color: #06b6d4; }
      .tts_system-log .log-type { color: #10b981; }
      .tts_error-log .log-type { color: #ef4444; }
      .tts_visual-log .log-type { color: #8b5cf6; }

      /* Performance Monitor Styles */
      .performance-monitor {
        margin-top: 20px;
        padding: 15px;
        background: linear-gradient(135deg, var(--background-primary) 0%, var(--background-secondary) 100%);
        border-radius: 10px;
        border: 1px solid var(--background-modifier-border);
      }

      .perf-metrics {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 10px;
      }

      .metric-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 12px;
        background: var(--background-secondary);
        border-radius: 6px;
        border: 1px solid var(--background-modifier-border);
        transition: all 0.2s ease;
      }

      .metric-item:hover {
        transform: scale(1.02);
        border-color: var(--interactive-accent);
      }

      .metric-label {
        font-size: 11px;
        font-weight: 600;
        color: var(--text-muted);
      }

      .metric-value {
        font-size: 12px;
        font-weight: 700;
        color: var(--interactive-accent);
        font-family: 'JetBrains Mono', monospace;
      }

      .dev-button {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.3s ease;
        font-size: 13px;
      }

      .dev-button.primary {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .dev-button.primary:hover {
        background: var(--interactive-accent-hover);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(var(--interactive-accent-rgb), 0.3);
      }

      .dev-button.secondary {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
        border: 1px solid var(--background-modifier-border);
      }

      .dev-button.secondary:hover {
        background: var(--background-modifier-active);
        border-color: var(--interactive-accent);
      }

      /* Vault Intelligence Button Styles */
      .vault-intelligence-controls {
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.1));
        border: 1px solid rgba(99, 102, 241, 0.2);
        border-radius: 12px;
        padding: 20px;
        margin-top: 15px;
      }

      .controls-title {
        color: var(--text-accent);
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 15px;
        text-align: center;
        background: linear-gradient(135deg, #6366f1, #a855f7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }

      .intelligence-row {
        display: flex;
        gap: 10px;
        margin-bottom: 10px;
      }

      .intelligence-row:last-child {
        margin-bottom: 0;
      }

      .vault-btn {
        flex: 1;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8));
        color: white;
        border: 1px solid rgba(255, 255, 255, 0.2);
        font-size: 12px;
        padding: 8px 12px;
        position: relative;
        overflow: hidden;
      }

      .vault-btn:hover {
        background: linear-gradient(135deg, rgba(99, 102, 241, 1), rgba(168, 85, 247, 1));
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
      }

      .vault-btn.highlight {
        background: linear-gradient(135deg, #f59e0b, #ef4444);
        animation: vault-pulse 2s ease-in-out infinite;
      }

      .vault-btn.highlight:hover {
        background: linear-gradient(135deg, #fbbf24, #f87171);
        box-shadow: 0 4px 15px rgba(245, 158, 11, 0.5);
      }

      /* Semantic-specific button styles */
      .vault-btn.semantic {
        background: linear-gradient(135deg, rgba(34, 197, 94, 0.8), rgba(59, 130, 246, 0.8));
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      .vault-btn.semantic:hover {
        background: linear-gradient(135deg, rgba(34, 197, 94, 1), rgba(59, 130, 246, 1));
        box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
      }

      .vault-btn.audit {
        background: linear-gradient(135deg, rgba(168, 85, 247, 0.8), rgba(236, 72, 153, 0.8));
        border: 1px solid rgba(168, 85, 247, 0.3);
      }

      .vault-btn.audit:hover {
        background: linear-gradient(135deg, rgba(168, 85, 247, 1), rgba(236, 72, 153, 1));
        box-shadow: 0 4px 12px rgba(168, 85, 247, 0.4);
      }

      .vault-btn.cache {
        background: linear-gradient(135deg, rgba(251, 146, 60, 0.8), rgba(245, 158, 11, 0.8));
        border: 1px solid rgba(251, 146, 60, 0.3);
      }

      .vault-btn.cache:hover {
        background: linear-gradient(135deg, rgba(251, 146, 60, 1), rgba(245, 158, 11, 1));
        box-shadow: 0 4px 12px rgba(251, 146, 60, 0.4);
      }

      @keyframes vault-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(245, 158, 11, 0.4); }
        50% { box-shadow: 0 0 0 8px rgba(245, 158, 11, 0); }
      }

      .input-form {
        margin-top: 20px;
        padding: 20px;
        background: var(--background-primary);
        border: 1px solid var(--background-modifier-border);
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        gap: 15px;
      }

      .dev-textarea {
        width: 100%;
        min-height: 80px;
        padding: 15px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 10px;
        background: var(--background-primary);
        color: var(--text-normal);
        font-family: var(--font-interface);
        font-size: 14px;
        line-height: 1.5;
        resize: vertical;
        transition: border-color 0.2s ease;
      }

      .dev-textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
        box-shadow: 0 0 0 2px rgba(var(--interactive-accent-rgb), 0.2);
      }

      .input-controls {
        display: flex;
        gap: 15px;
        justify-content: flex-end;
      }

      @media (max-width: 1024px) {
        .dev-panel {
          grid-template-columns: 1fr;
          gap: 20px;
        }
        
        .audio-controls-row {
          flex-direction: column;
          align-items: stretch;
        }
        
        .control-group {
          justify-content: space-between;
        }
        
        .input-controls {
          justify-content: center;
        }
      }

      @media (max-width: 768px) {
        .chat-controls {
          padding: 12px;
        }
        
        .control-group {
          flex-direction: column;
          align-items: stretch;
          gap: 8px;
        }
        
        .control-group label {
          min-width: auto;
          text-align: center;
        }
        
        .audio-controls-row {
          gap: 8px;
        }
        
        .dev-toggle {
          text-align: center;
        }
        
        .user-message {
          margin-left: 10px;
        }
        
        .ai-message {
          margin-right: 10px;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // STT Visualizer Properties
  private sttListeningAnimationFrame: number | null = null;
  private isSTTListening: boolean = false;

  private initializeSTTVisualizer(canvas: HTMLCanvasElement, label: HTMLElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 28;
    const minRadius = 8;
    
    // Create turquoise gradient (similar to TTS but turquoise instead of red/orange)
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#00ffff');
    gradient.addColorStop(0.6, '#20b2aa');
    gradient.addColorStop(0.8, '#008b8b');
    gradient.addColorStop(1, '#006666');
    
    // Draw initial static state
    const drawSTTVisualizer = (fillIntensity: number = 0) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#20b2aa40';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner filled circle based on intensity
      if (fillIntensity > 0) {
        const fillRadius = minRadius + (fillIntensity * (maxRadius - minRadius));
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add pulsing effect
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `#00ffff${Math.floor(fillIntensity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        // Static center circle when not active
        ctx.beginPath();
        ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#20b2aa60';
        ctx.fill();
      }
    };
    
    drawSTTVisualizer();
  }

  private initializeWakeWordVisualizer(canvas: HTMLCanvasElement, label: HTMLElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 28;
    const minRadius = 8;
    
    // Create purple/blue gradient for wake word
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.3, '#9f7aea');
    gradient.addColorStop(0.6, '#805ad5');
    gradient.addColorStop(0.8, '#553c9a');
    gradient.addColorStop(1, '#322659');
    
    // Draw initial static state
    const drawWakeVisualizer = (pulseIntensity: number = 0) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#805ad540';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Inner filled circle based on pulse
      if (pulseIntensity > 0) {
        const fillRadius = minRadius + (pulseIntensity * (maxRadius - minRadius));
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add pulsing effect rings
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius + (i * 3) + 2, 0, Math.PI * 2);
          const opacity = pulseIntensity * (1 - i * 0.3);
          ctx.strokeStyle = `#9f7aea${Math.floor(opacity * 255).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      } else {
        // Static center circle when not active
        ctx.beginPath();
        ctx.arc(centerX, centerY, minRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#805ad560';
        ctx.fill();
      }
    };
    
    drawWakeVisualizer();
    
    // Store the drawing function on the canvas for later use
    (canvas as any).drawWakeVisualizer = drawWakeVisualizer;
  }

  private triggerWakeWordPulse(canvas: HTMLCanvasElement): void {
    const drawFn = (canvas as any).drawWakeVisualizer;
    if (!drawFn) return;
    
    // Pulse animation for 1.5 seconds
    let intensity = 0;
    let increasing = true;
    const pulseInterval = setInterval(() => {
      if (increasing) {
        intensity += 0.1;
        if (intensity >= 1) {
          increasing = false;
        }
      } else {
        intensity -= 0.05;
        if (intensity <= 0) {
          intensity = 0;
          clearInterval(pulseInterval);
        }
      }
      drawFn(intensity);
    }, 50);
  }

  private async startSTTListening(canvas: HTMLCanvasElement, consoleOutput: HTMLElement): Promise<void> {
    if (this.isSTTListening) return;
    
    this.isSTTListening = true;
    this.logToConsole(consoleOutput, 'STT_START', 'Starting VAD-based recording...');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Try to get voice system for transcription
    const voiceSystem = this.plugin.voiceSystemV2;
    if (!voiceSystem) {
      this.logToConsole(consoleOutput, 'STT_ERROR', 'Voice system not available - using simulated mode');
      this.startSimulatedSTTVisualization(canvas);
      return;
    }
    
    try {
      // Create microphone stream for VAD and visualization
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.logToConsole(consoleOutput, 'STT_VAD', 'Microphone access granted - starting VAD monitoring');
      
      // Start VAD-based recording with visualization
      this.startVADBasedRecording(canvas, stream, consoleOutput, voiceSystem);
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'STT_ERROR', `Failed to access microphone: ${error}`);
      this.startSimulatedSTTVisualization(canvas);
    }
  }

  private async stopSTTListening(): Promise<void> {
    if (!this.isSTTListening) return;
    
    this.isSTTListening = false;
    
    if (this.sttListeningAnimationFrame) {
      cancelAnimationFrame(this.sttListeningAnimationFrame);
      this.sttListeningAnimationFrame = null;
    }
    
    // Stop VAD recording if active
    if (this.currentSTTRecorder) {
      try {
        // Request final data chunk before stopping
        if (this.currentSTTRecorder.state === 'recording') {
          this.currentSTTRecorder.requestData();
          // Small delay to allow final data collection
          await new Promise(resolve => setTimeout(resolve, 100));
          this.currentSTTRecorder.stop();
        }
      } catch (error) {
        console.warn('Error stopping STT recorder:', error);
      }
      this.currentSTTRecorder = null;
    }
    
    // Close audio context if it exists
    if (this.sttAudioContext) {
      await this.sttAudioContext.close();
      this.sttAudioContext = null;
    }
  }

  // VAD recording properties
  private currentSTTRecorder: MediaRecorder | null = null;
  private sttAudioContext: AudioContext | null = null;
  private sttRecordedChunks: Blob[] = [];
  private sttVADSilenceTimer: number | null = null;
  private sttVADSilenceThreshold: number = 0.4; // 40% threshold
  private sttVADSilenceTimeout: number = 3000; // 3 seconds
  private sttLastVADLevel: number = 0;
  private sttRecordingStartTime: number = 0;
  private sttMinimumRecordingTime: number = 1000; // Minimum 1 second of recording

  private startVADBasedRecording(canvas: HTMLCanvasElement, stream: MediaStream, consoleOutput: HTMLElement, voiceSystem: any): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set up audio analysis for VAD
    this.sttAudioContext = new AudioContext();
    const source = this.sttAudioContext.createMediaStreamSource(stream);
    const analyzer = this.sttAudioContext.createAnalyser();
    analyzer.fftSize = 256;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    source.connect(analyzer);
    
    // Set up MediaRecorder for actual audio capture
    this.sttRecordedChunks = [];
    
    // Try different MIME types for better browser compatibility
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg',
      ''
    ];
    
    let selectedMimeType = '';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType) || mimeType === '') {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    try {
      this.currentSTTRecorder = selectedMimeType 
        ? new MediaRecorder(stream, { mimeType: selectedMimeType })
        : new MediaRecorder(stream);
        
      this.logToConsole(consoleOutput, 'STT_CODEC', `Using MIME type: ${selectedMimeType || 'default'}`);
    } catch (e) {
      this.logToConsole(consoleOutput, 'STT_ERROR', `MediaRecorder creation failed: ${e}`);
      return;
    }
    
    this.currentSTTRecorder.ondataavailable = (event) => {
      this.logToConsole(consoleOutput, 'STT_DATA', `Audio chunk received: ${event.data.size} bytes`);
      if (event.data.size > 0) {
        this.sttRecordedChunks.push(event.data);
        
        // Future: Add streaming transcription logic here if needed
      }
    };
    
    this.currentSTTRecorder.onstop = async () => {
      this.logToConsole(consoleOutput, 'STT_STOP', `Recording stopped - collected ${this.sttRecordedChunks.length} chunks`);
      
      if (this.sttRecordedChunks.length > 0) {
        const totalSize = this.sttRecordedChunks.reduce((sum, chunk) => sum + chunk.size, 0);
        this.logToConsole(consoleOutput, 'STT_SIZE', `Total audio data: ${totalSize} bytes`);
        
        const audioBlob = new Blob(this.sttRecordedChunks, { 
          type: selectedMimeType || 'audio/webm' 
        });
        await this.transcribeAudioBlob(audioBlob, consoleOutput, voiceSystem);
      } else {
        this.logToConsole(consoleOutput, 'STT_ERROR', 'No audio chunks collected - trying direct transcription');
        // Try direct transcription without recorded data
        await this.transcribeWithWebSpeechAPI(new Blob(), consoleOutput);
      }
      
      this.sttRecordedChunks = [];
    };
    
    this.currentSTTRecorder.onerror = (event) => {
      this.logToConsole(consoleOutput, 'STT_REC_ERROR', `MediaRecorder error: ${event}`);
    };
    
    // Start recording with smaller intervals for more frequent data collection
    try {
      this.currentSTTRecorder.start(250); // Collect data every 250ms
      this.sttRecordingStartTime = Date.now();
      this.logToConsole(consoleOutput, 'STT_RECORD', `Recording started with ${selectedMimeType || 'default'} codec - speak now!`);
    } catch (startError) {
      this.logToConsole(consoleOutput, 'STT_START_ERROR', `Failed to start recording: ${startError}`);
    }
    
    // Visual and VAD monitoring
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 28;
    const minRadius = 8;
    
    // Create turquoise gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#00ffff');
    gradient.addColorStop(0.4, '#20b2aa');
    gradient.addColorStop(0.6, '#008b8b');
    gradient.addColorStop(0.8, '#006666');
    gradient.addColorStop(1, '#004444');
    
    const animate = () => {
      if (!this.isSTTListening) return;
      
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate VAD level (focus on speech frequencies)
      let vadLevel = 0;
      for (let i = 10; i < 80; i++) { // Human speech range
        vadLevel += dataArray[i];
      }
      vadLevel = vadLevel / (70 * 255); // Normalize to 0-1
      
      this.sttLastVADLevel = vadLevel;
      
      // VAD-based auto-stop logic (only after minimum recording time)
      const recordingDuration = Date.now() - this.sttRecordingStartTime;
      
      if (recordingDuration > this.sttMinimumRecordingTime) {
        if (vadLevel < this.sttVADSilenceThreshold) {
          if (this.sttVADSilenceTimer === null) {
            this.sttVADSilenceTimer = Date.now();
            this.logToConsole(consoleOutput, 'STT_VAD', `Voice activity below 40% - starting ${this.sttVADSilenceTimeout/1000}s countdown`);
          } else if (Date.now() - this.sttVADSilenceTimer > this.sttVADSilenceTimeout) {
            this.logToConsole(consoleOutput, 'STT_AUTO_STOP', `Auto-stopping after ${Math.round(recordingDuration/1000)}s: 3 seconds of silence detected`);
            this.stopSTTListening();
            return;
          }
        } else {
          // Reset silence timer when voice activity detected
          if (this.sttVADSilenceTimer !== null) {
            this.logToConsole(consoleOutput, 'STT_VAD', 'Voice activity resumed - resetting countdown');
            this.sttVADSilenceTimer = null;
          }
        }
      } else {
        // Show countdown during minimum recording period
        const remainingTime = Math.ceil((this.sttMinimumRecordingTime - recordingDuration) / 1000);
        if (remainingTime > 0 && recordingDuration % 500 < 50) { // Log every half second
          this.logToConsole(consoleOutput, 'STT_MIN_TIME', `Minimum recording time: ${remainingTime}s remaining`);
        }
      }
      
      // Apply sensitivity for visualization
      const sensitiveIntensity = Math.min(1, vadLevel * 4.0);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Outer ring with pulsing based on recording state
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = this.sttVADSilenceTimer !== null ? '#ff6b6b40' : '#20b2aa40';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Dynamic inner circle
      const fillRadius = minRadius + (sensitiveIntensity * (maxRadius - minRadius));
      ctx.beginPath();
      ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Pulsing rings based on intensity
      if (sensitiveIntensity > 0.1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `#00ffff${Math.floor(sensitiveIntensity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (sensitiveIntensity > 0.5) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `#20b2aa${Math.floor(sensitiveIntensity * 128).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      this.sttListeningAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private async transcribeAudioBlob(audioBlob: Blob, consoleOutput: HTMLElement, voiceSystem: any): Promise<void> {
    try {
      this.logToConsole(consoleOutput, 'STT_TRANSCRIBE', `Recorded ${Math.round(audioBlob.size / 1024)}KB of audio`);
      
      // Try using Whisper transcription directly
      if (voiceSystem && typeof (voiceSystem as any).transcribeWithWhisper === 'function') {
        try {
          this.logToConsole(consoleOutput, 'STT_WHISPER', 'Saving audio blob as temporary file for Whisper...');
          
          // Save audio blob as temporary file
          const tempAudioPath = await this.saveAudioBlobAsFile(audioBlob, consoleOutput);
          
          if (tempAudioPath) {
            this.logToConsole(consoleOutput, 'STT_WHISPER', `Calling Whisper transcription on: ${tempAudioPath}`);
            
            // Call Whisper transcription directly
            const transcription = await (voiceSystem as any).transcribeWithWhisper(tempAudioPath);
            
            // Clean up temp file
            try {
              const fs = require('fs');
              if (fs.existsSync(tempAudioPath)) {
                fs.unlinkSync(tempAudioPath);
                this.logToConsole(consoleOutput, 'STT_CLEANUP', 'Temporary audio file cleaned up');
              }
            } catch (cleanupError) {
              this.logToConsole(consoleOutput, 'STT_CLEANUP_ERROR', `Failed to cleanup: ${cleanupError.message}`);
            }
            
            if (transcription.success && transcription.text) {
              this.logToConsole(consoleOutput, 'STT_SUCCESS', `Whisper transcribed: "${transcription.text}"`);
              await this.sendTranscriptToAIChat(transcription.text, consoleOutput);
              return;
            } else {
              this.logToConsole(consoleOutput, 'STT_WHISPER_ERROR', `Whisper failed: ${transcription.error || 'No text returned'}`);
            }
          }
        } catch (whisperError) {
          this.logToConsole(consoleOutput, 'STT_WHISPER_ERROR', `Whisper processing failed: ${whisperError.message}`);
        }
      } else {
        this.logToConsole(consoleOutput, 'STT_NO_WHISPER', 'Whisper transcription method not available on voice system');
      }
      
      // Fallback: Use live Web Speech API recognition
      this.logToConsole(consoleOutput, 'STT_FALLBACK', 'Falling back to live Web Speech API...');
      await this.transcribeWithWebSpeechAPI(audioBlob, consoleOutput);
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'STT_ERROR', `All transcription methods failed: ${error.message}`);
    }
  }

  private async saveAudioBlobAsFile(audioBlob: Blob, consoleOutput: HTMLElement): Promise<string | null> {
    try {
      // Get required modules
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Create temp directory path
      const tempDir = path.join(os.tmpdir(), 'clippy-stt');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Create temp file path with timestamp
      const timestamp = Date.now();
      const tempFilePath = path.join(tempDir, `stt_recording_${timestamp}.webm`);
      
      this.logToConsole(consoleOutput, 'STT_SAVE', `Saving ${audioBlob.size} bytes to: ${tempFilePath}`);
      
      // Convert blob to buffer
      const arrayBuffer = await audioBlob.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      11
      // Write file
      fs.writeFileSync(tempFilePath, buffer);
      
      // Verify file was written
      if (fs.existsSync(tempFilePath)) {
        const fileSize = fs.statSync(tempFilePath).size;
        this.logToConsole(consoleOutput, 'STT_SAVE_SUCCESS', `Audio file saved: ${fileSize} bytes`);
        return tempFilePath;
      } else {
        throw new Error('File was not created');
      }
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'STT_SAVE_ERROR', `Failed to save audio file: ${error.message}`);
      return null;
    }
  }

  private async transcribeWithWebSpeechAPI(audioBlob: Blob, consoleOutput: HTMLElement): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      // Check if Web Speech API is available
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        reject(new Error('Web Speech API not supported in this browser'));
        return;
      }

      // Since Web Speech API can't process pre-recorded blobs, and the user just finished speaking,
      // we'll try a quick recognition session with a short timeout
      this.logToConsole(consoleOutput, 'STT_QUICK', 'Starting quick recognition - please repeat what you just said...');
      
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;

      let hasResult = false;

      recognition.onresult = async (event: any) => {
        hasResult = true;
        const transcript = event.results[0][0].transcript;
        const confidence = event.results[0][0].confidence;
        
        this.logToConsole(consoleOutput, 'STT_SUCCESS', `Transcribed: "${transcript}" (${Math.round(confidence * 100)}% confidence)`);
        await this.sendTranscriptToAIChat(transcript, consoleOutput);
        resolve();
      };

      recognition.onerror = (event: any) => {
        this.logToConsole(consoleOutput, 'STT_ERROR', `Speech recognition error: ${event.error}`);
        if (!hasResult) {
          reject(new Error(`Speech recognition error: ${event.error}`));
        }
      };

      recognition.onend = () => {
        if (!hasResult) {
          this.logToConsole(consoleOutput, 'STT_TIMEOUT', 'No speech detected - please try again');
          reject(new Error('No speech detected'));
        }
      };

      // Start recognition immediately
      try {
        recognition.start();
        
        // Auto-stop after 10 seconds to prevent hanging
        setTimeout(() => {
          if (!hasResult) {
            recognition.stop();
          }
        }, 10000);
        
      } catch (error) {
        reject(error);
      }
    });
  }

  private startWebSpeechRecognition(consoleOutput: HTMLElement, resolve: () => void, reject: (error: Error) => void): void {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      this.logToConsole(consoleOutput, 'STT_SUCCESS', `Web Speech API transcribed: "${transcript}"`);
      await this.sendTranscriptToAIChat(transcript, consoleOutput);
      resolve();
    };

    recognition.onerror = (event: any) => {
      this.logToConsole(consoleOutput, 'STT_ERROR', `Web Speech API error: ${event.error}`);
      reject(new Error(`Web Speech API error: ${event.error}`));
    };

    recognition.onend = () => {
      this.logToConsole(consoleOutput, 'STT_INFO', 'Web Speech API session ended');
    };

    this.logToConsole(consoleOutput, 'STT_FALLBACK', 'Please speak now for Web Speech API...');
    recognition.start();
  }

  private async sendTranscriptToAIChat(transcript: string, consoleOutput: HTMLElement): Promise<void> {
    this.logToConsole(consoleOutput, 'AI_CHAT_START', `sendTranscriptToAIChat called with: "${transcript}"`);
    this.logToConsole(consoleOutput, 'AI_CHAT_DEBUG', `Method execution timestamp: ${Date.now()}`);
    
    try {
      this.logToConsole(consoleOutput, 'AI_CHAT', `Sending transcript to AI: "${transcript}"`);
      
      // Find the dev panel chat elements
      const devPanelContainer = document.querySelector('.dev-panel-showcase');
      if (!devPanelContainer) {
        throw new Error('Dev panel showcase not found');
      }
      
      // Find the messages container and other required elements
      const messagesContainer = devPanelContainer.querySelector('.chat-messages') as HTMLElement;
      const audioVizCanvas = devPanelContainer.querySelector('.audio-visualizer canvas') as HTMLCanvasElement;
      const ttsCanvas = devPanelContainer.querySelector('.tts-visualizer-canvas') as HTMLCanvasElement;
      
      if (!messagesContainer) {
        throw new Error('Chat messages container not found');
      }
      
      // Debug canvas elements
      this.logToConsole(consoleOutput, 'AI_DEBUG', `Audio viz canvas found: ${!!audioVizCanvas}`);
      this.logToConsole(consoleOutput, 'AI_DEBUG', `TTS canvas found: ${!!ttsCanvas}`);
      
      // Get the actual dev panel state from the stored reference
      const storedDevPanelState = (devPanelContainer as any).__devPanelState;
      this.logToConsole(consoleOutput, 'AI_DEBUG', `Stored state exists: ${!!storedDevPanelState}`);
      
      if (storedDevPanelState) {
        this.logToConsole(consoleOutput, 'AI_DEBUG', `Stored TTS enabled: ${storedDevPanelState.ttsEnabled}`);
        this.logToConsole(consoleOutput, 'AI_DEBUG', `Stored STT enabled: ${storedDevPanelState.sttEnabled}`);
      }
      
      const devPanelState = storedDevPanelState || {
        ttsEnabled: false,
        sttEnabled: true,
        wakeWordEnabled: false,
        currentViz: 'spectrum'
      };
      
      this.logToConsole(consoleOutput, 'AI_DEBUG', `Final TTS state: ${devPanelState.ttsEnabled ? 'enabled' : 'disabled'}`);
      
      // Add user message to chat
      this.addChatMessage(messagesContainer, transcript, 'user', devPanelState);
      this.logToConsole(consoleOutput, 'USER_MESSAGE', transcript.substring(0, 50) + '...');
      
      // Generate real AI response (using the same method as the send button)
      // Create fallback canvas elements if they're null
      const fallbackAudioVizCanvas = audioVizCanvas || document.createElement('canvas');
      const fallbackTtsCanvas = ttsCanvas || document.createElement('canvas');
      
      if (!audioVizCanvas) {
        this.logToConsole(consoleOutput, 'AI_DEBUG', 'Using fallback audio viz canvas');
      }
      if (!ttsCanvas) {
        this.logToConsole(consoleOutput, 'AI_DEBUG', 'Using fallback TTS canvas');
      }
      
      await this.generateAIResponse(transcript, messagesContainer, consoleOutput, devPanelState, fallbackAudioVizCanvas, fallbackTtsCanvas);
      
      // Auto-disable STT button after successful AI submission
      await this.autoDisableSTTButton(consoleOutput);
      
      this.logToConsole(consoleOutput, 'AI_CHAT', 'Transcript sent to AI successfully and STT disabled');
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'AI_ERROR', `Failed to send transcript to AI: ${error.message}`);
    }
  }

  private async autoDisableSTTButton(consoleOutput: HTMLElement): Promise<void> {
    try {
      // Find the STT button and disable it
      const devPanelContainer = document.querySelector('.dev-panel-showcase');
      if (!devPanelContainer) return;
      
      const sttVisualizerContainer = devPanelContainer.querySelector('.stt-visualizer-container') as HTMLElement;
      if (!sttVisualizerContainer) return;
      
      // Remove active class and stop STT listening
      sttVisualizerContainer.classList.remove('active');
      this.stopSTTListening();
      
      // Update the global state if it exists (stored on the container for access)
      const devPanelState = (devPanelContainer as any).__devPanelState;
      if (devPanelState) {
        devPanelState.sttEnabled = false;
      }
      
      this.logToConsole(consoleOutput, 'STT_AUTO_DISABLE', 'STT button automatically disabled after AI response');
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'STT_DISABLE_ERROR', `Failed to auto-disable STT: ${error.message}`);
    }
  }

  private async startWakeWordDetection(consoleOutput: HTMLElement, wakeCanvas?: HTMLCanvasElement): Promise<void> {
    try {
      this.logToConsole(consoleOutput, 'WAKE_WORD_START', 'Initializing OpenWakeWord detection...');
      
      // Get the voice system from the plugin 
      const voiceSystem = this.plugin.voiceSystemV2;
      if (!voiceSystem) {
        this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', 'Voice system not available');
        return;
      }

      this.logToConsole(consoleOutput, 'WAKE_WORD_SYSTEM', 'Accessing wake word manager...');
      
      // Check if voice system has wake word capabilities
      if (voiceSystem && 'wakeWordManager' in voiceSystem) {
        const wakeWordManager = (voiceSystem as any).wakeWordManager;
        
        if (wakeWordManager) {
          this.logToConsole(consoleOutput, 'WAKE_WORD_MANAGER', 'Starting wake word detection with OpenWakeWord...');
          
          // Debug: Check engine status
          const engineStatus = wakeWordManager.getEngineStatus ? wakeWordManager.getEngineStatus() : 'No status method';
          this.logToConsole(consoleOutput, 'WAKE_WORD_DEBUG', `Engine status: ${JSON.stringify(engineStatus)}`);
          
          // Debug: Check available engines
          if (wakeWordManager.getAvailableEngines) {
            try {
              const availableEngines = await wakeWordManager.getAvailableEngines();
              this.logToConsole(consoleOutput, 'WAKE_WORD_DEBUG', `Available engines: ${JSON.stringify(availableEngines)}`);
            } catch (e) {
              this.logToConsole(consoleOutput, 'WAKE_WORD_DEBUG', `Get available engines error: ${e.message}`);
            }
          }
          
          // Store canvas reference for pulse animation
          (this as any).currentWakeCanvas = wakeCanvas;
          
          // Set up wake word detection event listener
          wakeWordManager.on('wake-word-detected', (detection: any) => {
            this.logToConsole(consoleOutput, 'WAKE_WORD_DETECTED', 
              `🔥 Wake word detected: "${detection.wakeWord}" (${Math.round(detection.confidence * 100)}% confidence)`);
            
            // Trigger pulse animation if canvas available
            if (wakeCanvas) {
              this.triggerWakeWordPulse(wakeCanvas);
            }
              
            // Auto-trigger STT when wake word is detected
            this.handleWakeWordDetection(consoleOutput);
          });
          
          // Start detection
          const success = await wakeWordManager.startDetection();
          if (success) {
            this.logToConsole(consoleOutput, 'WAKE_WORD_SUCCESS', 'OpenWakeWord detection started - listening for "hey_mycroft", "hey_jarvis", "alexa"');
          } else {
            this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', 'Failed to start wake word detection');
          }
        } else {
          this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', 'Wake word manager not found in voice system');
        }
      } else {
        this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', 'Voice system does not support wake word detection');
      }
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', `Failed to start wake word detection: ${error.message}`);
    }
  }

  private async stopWakeWordDetection(consoleOutput: HTMLElement): Promise<void> {
    try {
      this.logToConsole(consoleOutput, 'WAKE_WORD_STOP', 'Stopping wake word detection...');
      
      const voiceSystem = this.plugin.voiceSystemV2;
      if (voiceSystem && 'wakeWordManager' in voiceSystem) {
        const wakeWordManager = (voiceSystem as any).wakeWordManager;
        
        if (wakeWordManager) {
          await wakeWordManager.stopDetection();
          this.logToConsole(consoleOutput, 'WAKE_WORD_STOPPED', 'Wake word detection stopped');
        }
      }
      
    } catch (error) {
      this.logToConsole(consoleOutput, 'WAKE_WORD_ERROR', `Failed to stop wake word detection: ${error.message}`);
    }
  }

  private handleWakeWordDetection(consoleOutput: HTMLElement): void {
    // Quick acknowledgment response
    this.playQuickAcknowledgment();
    
    // Auto-trigger STT when wake word is detected
    this.logToConsole(consoleOutput, 'WAKE_WORD_TRIGGER', '🎯 Wake word triggered - starting STT automatically...');
    
    // Find and trigger the STT button
    const devPanelContainer = document.querySelector('.dev-panel-showcase');
    if (devPanelContainer) {
      const sttVisualizerContainer = devPanelContainer.querySelector('.stt-visualizer-container') as HTMLElement;
      if (sttVisualizerContainer && !sttVisualizerContainer.classList.contains('active')) {
        // Simulate STT button click
        sttVisualizerContainer.click();
      }
    }
  }

  private async playQuickAcknowledgment(): Promise<void> {
    try {
      // Quick acknowledgment responses
      const responses = ["Yes?", "How can I help?", "I'm here.", "What do you need?", "Listening."];
      const response = responses[Math.floor(Math.random() * responses.length)];
      
      // Try to use the voice system for TTS if available
      const voiceSystem = this.plugin.voiceSystemV2;
      if (voiceSystem && 'ttsManager' in voiceSystem) {
        const ttsManager = (voiceSystem as any).ttsManager;
        if (ttsManager && 'synthesize' in ttsManager) {
          // Use brief, quick synthesis for acknowledgment
          await ttsManager.synthesize(response);
          return;
        }
      }
      
      // Fallback to browser speech synthesis if voice system unavailable
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(response);
        utterance.rate = 1.2; // Slightly faster for quick response
        utterance.volume = 0.8;
        window.speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.debug('[WakeWord] Quick acknowledgment failed:', error);
    }
  }

  private createSTTAudioSpectrum(canvas: HTMLCanvasElement, stream: MediaStream, consoleOutput: HTMLElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyzer = audioContext.createAnalyser();
    
    analyzer.fftSize = 256;
    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    source.connect(analyzer);
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 28;
    const minRadius = 8;
    
    // Create turquoise gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#00ffff');
    gradient.addColorStop(0.4, '#20b2aa');
    gradient.addColorStop(0.6, '#008b8b');
    gradient.addColorStop(0.8, '#006666');
    gradient.addColorStop(1, '#004444');
    
    const animate = () => {
      if (!this.isSTTListening) return;
      
      analyzer.getByteFrequencyData(dataArray);
      
      // Calculate audio intensity (focus on speech frequencies)
      let intensity = 0;
      for (let i = 10; i < 80; i++) { // Human speech range
        intensity += dataArray[i];
      }
      intensity = intensity / (70 * 255); // Normalize
      
      // Apply sensitivity multiplier like TTS
      const sensitiveIntensity = Math.min(1, intensity * 4.0);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#20b2aa40';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Dynamic inner circle
      const fillRadius = minRadius + (sensitiveIntensity * (maxRadius - minRadius));
      ctx.beginPath();
      ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Pulsing rings based on intensity
      if (sensitiveIntensity > 0.1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `#00ffff${Math.floor(sensitiveIntensity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (sensitiveIntensity > 0.5) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `#20b2aa${Math.floor(sensitiveIntensity * 128).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      this.sttListeningAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }

  private startSimulatedSTTVisualization(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = 28;
    const minRadius = 8;
    
    // Create turquoise gradient
    const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, '#00ffff');
    gradient.addColorStop(0.4, '#20b2aa');
    gradient.addColorStop(0.6, '#008b8b');
    gradient.addColorStop(0.8, '#006666');
    gradient.addColorStop(1, '#004444');
    
    let time = 0;
    
    const animate = () => {
      if (!this.isSTTListening) return;
      
      time += 0.1;
      
      // Simulate speech detection with varying intensity
      const baseIntensity = (Math.sin(time * 0.5) + 1) / 2;
      const speechBurst = time % 3 < 1.5 ? Math.sin((time % 1.5) * 4) * 0.5 + 0.5 : 0;
      const intensity = Math.max(baseIntensity * 0.3, speechBurst);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Outer ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
      ctx.strokeStyle = '#20b2aa40';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Dynamic inner circle
      const fillRadius = minRadius + (intensity * (maxRadius - minRadius));
      ctx.beginPath();
      ctx.arc(centerX, centerY, fillRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Pulsing effects
      if (intensity > 0.1) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, fillRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `#00ffff${Math.floor(intensity * 255).toString(16).padStart(2, '0')}`;
        ctx.lineWidth = 1;
        ctx.stroke();
        
        if (intensity > 0.5) {
          ctx.beginPath();
          ctx.arc(centerX, centerY, fillRadius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = `#20b2aa${Math.floor(intensity * 128).toString(16).padStart(2, '0')}`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
      
      this.sttListeningAnimationFrame = requestAnimationFrame(animate);
    };
    
    animate();
  }
}

/**
 * Simple Audio Visualizer System for showcase demo
 */
class AudioVisualizerSystem {
  private audioContext: AudioContext | null = null;
  private oscillator: OscillatorNode | null = null;
  private isPlaying = false;
  private colorScheme = 'neon';

  async startAudio(): Promise<void> {
    try {
      if (!this.audioContext) {
        this.audioContext = new AudioContext();
      }
      
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      this.isPlaying = true;
      console.log('🎵 Audio system started (demo mode)');
    } catch (error) {
      console.error('Failed to start audio:', error);
      throw error;
    }
  }

  stopAudio(): void {
    if (this.oscillator) {
      this.oscillator.stop();
      this.oscillator = null;
    }
    this.isPlaying = false;
    console.log('🎵 Audio system stopped');
  }

  playTestTone(): void {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    // Create a brief test tone
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4 note
    gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.5);
    
    oscillator.start();
    oscillator.stop(this.audioContext.currentTime + 0.5);
    
    console.log('🎵 Playing test tone');
  }

  setColorScheme(scheme: string): void {
    this.colorScheme = scheme;
    console.log(`🎨 Color scheme changed to: ${scheme}`);
    
    // Apply color scheme to visualizers (demo implementation)
    const visualizers = document.querySelectorAll('.audio-visualizer-container');
    visualizers.forEach((visualizer, index) => {
      const canvas = visualizer.querySelector('canvas') as HTMLCanvasElement;
      if (canvas) {
        // Update canvas background based on color scheme
        const colors = this.getColorSchemeColors(scheme);
        canvas.style.background = `linear-gradient(45deg, ${colors.primary}20, ${colors.secondary}20)`;
      }
    });
  }

  private getColorSchemeColors(scheme: string) {
    const schemes = {
      neon: { primary: '#00ff88', secondary: '#ff0088', accent: '#0088ff' },
      fire: { primary: '#ff4500', secondary: '#ff6347', accent: '#ffd700' },
      ocean: { primary: '#00bfff', secondary: '#1e90ff', accent: '#87ceeb' },
      rainbow: { primary: '#ff0000', secondary: '#00ff00', accent: '#0000ff' },
      matrix: { primary: '#00ff00', secondary: '#008000', accent: '#90ee90' },
      cyberpunk: { primary: '#ff2a6d', secondary: '#01b4ff', accent: '#d63384' }
    };
    
    return schemes[scheme as keyof typeof schemes] || schemes.neon;
  }

}