/**
 * CLIPPY AI Assistant - Geometric Pattern Generator
 * Creates algorithmic geometric patterns and mathematical visualizations
 * Perfect for enhancing Obsidian's graph view with sacred geometry and fractals
 */

export interface PatternConfig {
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  scale: number;
  rotation: number;
  iterations: number;
  strokeWidth: number;
  strokeColor: string;
  fillColor?: string;
  opacity: number;
  animated: boolean;
  animationSpeed: number;
}

export interface Point {
  x: number;
  y: number;
}

export class GeometricPatternGenerator {
  private svg: SVGElement;
  private config: PatternConfig;
  private animationFrameId: number | null = null;
  private startTime: number = Date.now();

  constructor(container: HTMLElement, config: Partial<PatternConfig> = {}) {
    this.config = {
      width: 800,
      height: 600,
      centerX: 400,
      centerY: 300,
      scale: 1,
      rotation: 0,
      iterations: 5,
      strokeWidth: 1,
      strokeColor: '#6366f1',
      opacity: 0.3,
      animated: true,
      animationSpeed: 1,
      ...config
    };

    this.createSVG(container);
  }

  private createSVG(container: HTMLElement): void {
    // Create SVG container
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.svg.setAttribute('width', this.config.width.toString());
    this.svg.setAttribute('height', this.config.height.toString());
    this.svg.setAttribute('class', 'clippy-geometric-pattern');
    
    this.svg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      opacity: ${this.config.opacity};
    `;

    container.appendChild(this.svg);
    console.log('🔮 Geometric pattern generator initialized');
  }

  /**
   * Generate Flower of Life pattern - sacred geometry classic
   */
  public generateFlowerOfLife(radius: number = 50): void {
    this.clearPattern();
    
    const group = this.createGroup('flower-of-life');
    
    // Central circle
    this.addCircle(group, this.config.centerX, this.config.centerY, radius);
    
    // Six surrounding circles
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = this.config.centerX + Math.cos(angle) * radius;
      const y = this.config.centerY + Math.sin(angle) * radius;
      this.addCircle(group, x, y, radius);
    }
    
    // Outer layer (optional, based on iterations)
    if (this.config.iterations > 1) {
      for (let layer = 2; layer <= this.config.iterations; layer++) {
        const layerRadius = radius * layer;
        const circlesInLayer = layer * 6;
        
        for (let i = 0; i < circlesInLayer; i++) {
          const angle = (i * 2 * Math.PI) / circlesInLayer;
          const x = this.config.centerX + Math.cos(angle) * layerRadius;
          const y = this.config.centerY + Math.sin(angle) * layerRadius;
          this.addCircle(group, x, y, radius);
        }
      }
    }

    if (this.config.animated) {
      this.animatePattern(group, 'geometry-pulse');
    }
  }

  /**
   * Generate Metatron's Cube - another sacred geometry pattern
   */
  public generateMetatronsCube(radius: number = 100): void {
    this.clearPattern();
    
    const group = this.createGroup('metatrons-cube');
    
    // Generate the 13 circles of Metatron's Cube
    const circles = this.getMetatronsCircles(radius);
    
    circles.forEach(circle => {
      this.addCircle(group, circle.x, circle.y, radius / 4);
    });
    
    // Connect the circles with lines to form the cube structure
    this.connectMetatronsPoints(group, circles);

    if (this.config.animated) {
      this.animatePattern(group, 'fractal-grow');
    }
  }

  /**
   * Generate fractal tree structure
   */
  public generateFractalTree(length: number = 100, angle: number = Math.PI / 6): void {
    this.clearPattern();
    
    const group = this.createGroup('fractal-tree');
    
    // Start from bottom center
    const startX = this.config.centerX;
    const startY = this.config.height - 50;
    
    this.drawFractalBranch(group, startX, startY, -Math.PI / 2, length, this.config.iterations, angle);

    if (this.config.animated) {
      this.animatePattern(group, 'fractal-grow');
    }
  }

  /**
   * Generate spiral pattern based on golden ratio
   */
  public generateGoldenSpiral(size: number = 200): void {
    this.clearPattern();
    
    const group = this.createGroup('golden-spiral');
    const goldenRatio = (1 + Math.sqrt(5)) / 2;
    
    let currentSize = size;
    let currentX = this.config.centerX;
    let currentY = this.config.centerY;
    let rotation = 0;
    
    for (let i = 0; i < this.config.iterations; i++) {
      // Create quarter circle arc
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      
      const startAngle = rotation;
      const endAngle = rotation + Math.PI / 2;
      
      const x1 = currentX + Math.cos(startAngle) * currentSize;
      const y1 = currentY + Math.sin(startAngle) * currentSize;
      const x2 = currentX + Math.cos(endAngle) * currentSize;
      const y2 = currentY + Math.sin(endAngle) * currentSize;
      
      const pathData = `M ${x1} ${y1} A ${currentSize} ${currentSize} 0 0 1 ${x2} ${y2}`;
      
      path.setAttribute('d', pathData);
      path.setAttribute('stroke', this.config.strokeColor);
      path.setAttribute('stroke-width', this.config.strokeWidth.toString());
      path.setAttribute('fill', 'none');
      path.classList.add('clippy-spiral-connection');
      
      group.appendChild(path);
      
      // Update for next iteration
      currentSize /= goldenRatio;
      rotation += Math.PI / 2;
      
      // Move to next position
      currentX += Math.cos(rotation) * currentSize * goldenRatio;
      currentY += Math.sin(rotation) * currentSize * goldenRatio;
    }

    if (this.config.animated) {
      this.animatePattern(group, 'spiral-glow');
    }
  }

  /**
   * Generate Mandala pattern
   */
  public generateMandala(radius: number = 150): void {
    this.clearPattern();
    
    const group = this.createGroup('mandala');
    const layers = this.config.iterations;
    
    for (let layer = 0; layer < layers; layer++) {
      const layerRadius = (radius * (layer + 1)) / layers;
      const petals = (layer + 1) * 8;
      
      for (let i = 0; i < petals; i++) {
        const angle = (i * 2 * Math.PI) / petals;
        const x = this.config.centerX + Math.cos(angle) * layerRadius;
        const y = this.config.centerY + Math.sin(angle) * layerRadius;
        
        // Create petal shape
        const petal = this.createPetal(x, y, layerRadius / 10, angle);
        group.appendChild(petal);
      }
    }

    if (this.config.animated) {
      this.animatePattern(group, 'geometry-pulse');
    }
  }

  /**
   * Generate Sri Yantra - the most sacred Hindu and Buddhist symbol
   */
  public generateSriYantra(size: number = 150): void {
    this.clearPattern();
    
    const group = this.createGroup('sri-yantra');
    
    // Outer square with gates (bhupura)
    this.addRectangleWithGates(group, this.config.centerX, this.config.centerY, size * 2);
    
    // Three concentric circles
    for (let i = 1; i <= 3; i++) {
      this.addCircle(group, this.config.centerX, this.config.centerY, size * (1.5 - i * 0.2));
    }
    
    // 16-petal lotus
    this.addLotusRing(group, this.config.centerX, this.config.centerY, size * 1.2, 16);
    
    // 8-petal lotus
    this.addLotusRing(group, this.config.centerX, this.config.centerY, size * 0.9, 8);
    
    // Nine interlacing triangles (simplified version)
    this.addYantraTriangles(group, this.config.centerX, this.config.centerY, size * 0.7);
    
    // Central point (bindu)
    const bindu = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    bindu.setAttribute('cx', this.config.centerX.toString());
    bindu.setAttribute('cy', this.config.centerY.toString());
    bindu.setAttribute('r', '3');
    bindu.setAttribute('fill', this.config.strokeColor);
    bindu.classList.add('clippy-yantra-bindu');
    group.appendChild(bindu);

    if (this.config.animated) {
      this.animatePattern(group, 'yantra-sacred');
    }
  }

  /**
   * Generate Vesica Piscis - symbol of divine feminine
   */
  public generateVesicaPiscis(radius: number = 100): void {
    this.clearPattern();
    
    const group = this.createGroup('vesica-piscis');
    
    const overlap = radius * 0.5; // How much circles overlap
    const leftX = this.config.centerX - overlap;
    const rightX = this.config.centerX + overlap;
    
    // Two overlapping circles
    this.addCircle(group, leftX, this.config.centerY, radius);
    this.addCircle(group, rightX, this.config.centerY, radius);
    
    // Highlight the vesica (intersection) with a path
    const vesicaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const height = Math.sqrt(radius * radius - overlap * overlap);
    
    const pathData = `M ${this.config.centerX} ${this.config.centerY - height} 
                     A ${radius} ${radius} 0 0 1 ${this.config.centerX} ${this.config.centerY + height}
                     A ${radius} ${radius} 0 0 1 ${this.config.centerX} ${this.config.centerY - height}`;
    
    vesicaPath.setAttribute('d', pathData);
    vesicaPath.setAttribute('fill', this.config.strokeColor);
    vesicaPath.setAttribute('fill-opacity', '0.2');
    vesicaPath.setAttribute('stroke', this.config.strokeColor);
    vesicaPath.setAttribute('stroke-width', (this.config.strokeWidth * 2).toString());
    vesicaPath.classList.add('clippy-vesica-highlight');
    group.appendChild(vesicaPath);

    if (this.config.animated) {
      this.animatePattern(group, 'vesica-breathe');
    }
  }

  /**
   * Generate Seed of Life - foundation of all sacred geometry
   */
  public generateSeedOfLife(radius: number = 60): void {
    this.clearPattern();
    
    const group = this.createGroup('seed-of-life');
    
    // Central circle
    this.addCircle(group, this.config.centerX, this.config.centerY, radius);
    
    // Six surrounding circles forming the seed
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      const x = this.config.centerX + Math.cos(angle) * radius;
      const y = this.config.centerY + Math.sin(angle) * radius;
      this.addCircle(group, x, y, radius);
    }

    if (this.config.animated) {
      this.animatePattern(group, 'seed-grow');
    }
  }

  /**
   * Generate Platonic Solids projection (dodecahedron)
   */
  public generatePlatonicSolid(type: 'dodecahedron' | 'icosahedron' | 'tetrahedron' = 'dodecahedron', size: number = 100): void {
    this.clearPattern();
    
    const group = this.createGroup(`platonic-${type}`);
    
    switch (type) {
      case 'dodecahedron':
        this.drawDodecahedron(group, size);
        break;
      case 'icosahedron':
        this.drawIcosahedron(group, size);
        break;
      case 'tetrahedron':
        this.drawTetrahedron(group, size);
        break;
    }

    if (this.config.animated) {
      this.animatePattern(group, 'platonic-rotate');
    }
  }

  /**
   * Generate Tree of Life (Kabbalah)
   */
  public generateTreeOfLife(size: number = 200): void {
    this.clearPattern();
    
    const group = this.createGroup('tree-of-life');
    
    // Define the 10 sephirot positions
    const sephirot = this.getSephirotPositions(size);
    
    // Draw the 22 paths connecting sephirot
    this.drawTreePaths(group, sephirot);
    
    // Draw the 10 sephirot as circles
    sephirot.forEach((sephira, index) => {
      this.addCircle(group, sephira.x, sephira.y, size / 15);
      
      // Add sephira number
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', sephira.x.toString());
      text.setAttribute('y', (sephira.y + 4).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('fill', this.config.strokeColor);
      text.textContent = (index + 1).toString();
      text.classList.add('clippy-sephira-number');
      group.appendChild(text);
    });

    if (this.config.animated) {
      this.animatePattern(group, 'tree-wisdom');
    }
  }

  /**
   * Generate Merkaba (3D Star Tetrahedron)
   */
  public generateMerkaba(size: number = 120): void {
    this.clearPattern();
    
    const group = this.createGroup('merkaba');
    
    // Create two interlocking triangles (Star of David base)
    const points1 = this.getTrianglePoints(this.config.centerX, this.config.centerY, size, 0);
    const points2 = this.getTrianglePoints(this.config.centerX, this.config.centerY, size, Math.PI);
    
    // Draw upward triangle
    const triangle1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    triangle1.setAttribute('points', points1.map(p => `${p.x},${p.y}`).join(' '));
    triangle1.setAttribute('stroke', this.config.strokeColor);
    triangle1.setAttribute('stroke-width', this.config.strokeWidth.toString());
    triangle1.setAttribute('fill', 'none');
    triangle1.classList.add('clippy-merkaba-up');
    group.appendChild(triangle1);
    
    // Draw downward triangle
    const triangle2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    triangle2.setAttribute('points', points2.map(p => `${p.x},${p.y}`).join(' '));
    triangle2.setAttribute('stroke', this.config.strokeColor);
    triangle2.setAttribute('stroke-width', this.config.strokeWidth.toString());
    triangle2.setAttribute('fill', 'none');
    triangle2.classList.add('clippy-merkaba-down');
    group.appendChild(triangle2);
    
    // Add inner hexagon formed by intersection
    const hexPoints = this.getHexagonPoints(this.config.centerX, this.config.centerY, size * 0.5);
    const hexagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    hexagon.setAttribute('points', hexPoints.map(p => `${p.x},${p.y}`).join(' '));
    hexagon.setAttribute('stroke', this.config.strokeColor);
    hexagon.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
    hexagon.setAttribute('fill', this.config.strokeColor);
    hexagon.setAttribute('fill-opacity', '0.1');
    hexagon.classList.add('clippy-merkaba-center');
    group.appendChild(hexagon);

    if (this.config.animated) {
      this.animatePattern(group, 'merkaba-spin');
    }
  }

  /**
   * Generate Torus/Toroidal field visualization
   */
  public generateTorus(majorRadius: number = 80, minorRadius: number = 30): void {
    this.clearPattern();
    
    const group = this.createGroup('torus');
    
    // Draw torus using ellipses and curves
    for (let angle = 0; angle < 2 * Math.PI; angle += Math.PI / 8) {
      // Outer ring
      const outerX = this.config.centerX + Math.cos(angle) * majorRadius;
      const outerY = this.config.centerY + Math.sin(angle) * majorRadius * 0.3; // Flattened perspective
      
      // Draw ring section
      const ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
      ellipse.setAttribute('cx', outerX.toString());
      ellipse.setAttribute('cy', outerY.toString());
      ellipse.setAttribute('rx', minorRadius.toString());
      ellipse.setAttribute('ry', (minorRadius * 0.3).toString());
      ellipse.setAttribute('stroke', this.config.strokeColor);
      ellipse.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
      ellipse.setAttribute('fill', 'none');
      ellipse.setAttribute('opacity', (0.7 - Math.abs(Math.sin(angle)) * 0.4).toString());
      ellipse.classList.add('clippy-torus-ring');
      group.appendChild(ellipse);
    }
    
    // Central flow lines
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI) / 6;
      const path = this.createTorusFlowLine(angle, majorRadius, minorRadius);
      group.appendChild(path);
    }

    if (this.config.animated) {
      this.animatePattern(group, 'torus-flow');
    }
  }

  /**
   * Generate Voronoi diagram
   */
  public generateVoronoi(points: Point[]): void {
    this.clearPattern();
    
    const group = this.createGroup('voronoi');
    
    // Simple Voronoi implementation (for demonstration)
    // In a real implementation, you'd use a proper Voronoi algorithm
    points.forEach((point, index) => {
      const polygon = this.createVoronoiCell(point, points, index);
      if (polygon) {
        group.appendChild(polygon);
      }
    });

    if (this.config.animated) {
      this.animatePattern(group, 'voronoi-breathe');
    }
  }

  /**
   * Generate wave interference pattern
   */
  public generateWaveInterference(sources: Point[], frequency: number = 0.1): void {
    this.clearPattern();
    
    const group = this.createGroup('wave-interference');
    
    // Create interference pattern using mathematical waves
    for (let x = 0; x < this.config.width; x += 10) {
      for (let y = 0; y < this.config.height; y += 10) {
        let amplitude = 0;
        
        sources.forEach(source => {
          const distance = Math.sqrt((x - source.x) ** 2 + (y - source.y) ** 2);
          amplitude += Math.sin(distance * frequency) / (distance * 0.01 + 1);
        });
        
        if (Math.abs(amplitude) > 0.5) {
          const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
          circle.setAttribute('cx', x.toString());
          circle.setAttribute('cy', y.toString());
          circle.setAttribute('r', (Math.abs(amplitude) * 3).toString());
          circle.setAttribute('fill', this.config.strokeColor);
          circle.setAttribute('opacity', (Math.abs(amplitude) * 0.3).toString());
          circle.classList.add('clippy-wave-line');
          
          group.appendChild(circle);
        }
      }
    }

    if (this.config.animated) {
      this.animatePattern(group, 'wave-flow');
    }
  }

  /**
   * Generate standing wave pattern
   */
  public generateStandingWave(wavelength: number = 40, amplitude: number = 30): void {
    this.clearPattern();
    
    const group = this.createGroup('standing-wave');
    
    // Horizontal standing wave
    for (let x = 0; x < this.config.width; x += 5) {
      const waveY = this.config.centerY + amplitude * Math.sin((x * 2 * Math.PI) / wavelength);
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x.toString());
      circle.setAttribute('cy', waveY.toString());
      circle.setAttribute('r', '2');
      circle.setAttribute('fill', this.config.strokeColor);
      circle.setAttribute('opacity', '0.6');
      circle.classList.add('clippy-wave-particle');
      
      group.appendChild(circle);
    }
    
    // Vertical standing wave
    for (let y = 0; y < this.config.height; y += 5) {
      const waveX = this.config.centerX + amplitude * Math.sin((y * 2 * Math.PI) / wavelength);
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', waveX.toString());
      circle.setAttribute('cy', y.toString());
      circle.setAttribute('r', '2');
      circle.setAttribute('fill', this.config.strokeColor);
      circle.setAttribute('opacity', '0.4');
      circle.classList.add('clippy-wave-particle');
      
      group.appendChild(circle);
    }

    if (this.config.animated) {
      this.animatePattern(group, 'wave-oscillate');
    }
  }

  /**
   * Generate circular wave ripples (like dropping a stone in water)
   */
  public generateRippleWaves(center: Point, maxRadius: number = 200, ringCount: number = 8): void {
    this.clearPattern();
    
    const group = this.createGroup('ripple-waves');
    
    for (let i = 1; i <= ringCount; i++) {
      const radius = (maxRadius * i) / ringCount;
      const opacity = 1 - (i / ringCount) * 0.7; // Fade outer rings
      
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', center.x.toString());
      circle.setAttribute('cy', center.y.toString());
      circle.setAttribute('r', radius.toString());
      circle.setAttribute('stroke', this.config.strokeColor);
      circle.setAttribute('stroke-width', (this.config.strokeWidth * opacity).toString());
      circle.setAttribute('fill', 'none');
      circle.setAttribute('opacity', opacity.toString());
      circle.classList.add('clippy-ripple-ring');
      
      group.appendChild(circle);
    }

    if (this.config.animated) {
      this.animatePattern(group, 'ripple-expand');
    }
  }

  /**
   * Generate sine wave with harmonics
   */
  public generateHarmonicWave(fundamentalFreq: number = 0.05, harmonics: number[] = [1, 0.5, 0.25]): void {
    this.clearPattern();
    
    const group = this.createGroup('harmonic-wave');
    
    // Create wave path
    let pathData = '';
    const resolution = 2;
    
    for (let x = 0; x <= this.config.width; x += resolution) {
      let y = this.config.centerY;
      
      // Add fundamental frequency and harmonics
      harmonics.forEach((amplitude, index) => {
        const harmonic = index + 1;
        y += amplitude * 40 * Math.sin(x * fundamentalFreq * harmonic * 2 * Math.PI);
      });
      
      if (x === 0) {
        pathData += `M ${x} ${y}`;
      } else {
        pathData += ` L ${x} ${y}`;
      }
    }
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', this.config.strokeColor);
    path.setAttribute('stroke-width', this.config.strokeWidth.toString());
    path.setAttribute('fill', 'none');
    path.classList.add('clippy-harmonic-wave');
    
    group.appendChild(path);
    
    // Add individual harmonic components (faded)
    harmonics.forEach((amplitude, index) => {
      let harmonicPath = '';
      const harmonic = index + 1;
      
      for (let x = 0; x <= this.config.width; x += resolution) {
        const y = this.config.centerY + amplitude * 40 * Math.sin(x * fundamentalFreq * harmonic * 2 * Math.PI);
        
        if (x === 0) {
          harmonicPath += `M ${x} ${y}`;
        } else {
          harmonicPath += ` L ${x} ${y}`;
        }
      }
      
      const harmonicPathElement = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      harmonicPathElement.setAttribute('d', harmonicPath);
      harmonicPathElement.setAttribute('stroke', this.config.strokeColor);
      harmonicPathElement.setAttribute('stroke-width', (this.config.strokeWidth * 0.3).toString());
      harmonicPathElement.setAttribute('fill', 'none');
      harmonicPathElement.setAttribute('opacity', '0.3');
      harmonicPathElement.setAttribute('stroke-dasharray', '5,5');
      harmonicPathElement.classList.add(`clippy-harmonic-${harmonic}`);
      
      group.appendChild(harmonicPathElement);
    });

    if (this.config.animated) {
      this.animatePattern(group, 'wave-flow');
    }
  }

  /**
   * Generate wave diffraction pattern
   */
  public generateDiffractionPattern(slitCount: number = 2, slitWidth: number = 20, screenDistance: number = 300): void {
    this.clearPattern();
    
    const group = this.createGroup('diffraction-pattern');
    
    // Single or double slit setup
    const slitSpacing = 60;
    const slitCenterY = this.config.height / 4;
    
    // Draw slits
    for (let i = 0; i < slitCount; i++) {
      const slitY = slitCenterY - (slitCount - 1) * slitSpacing / 2 + i * slitSpacing;
      
      const slit = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      slit.setAttribute('x', (this.config.width / 4).toString());
      slit.setAttribute('y', (slitY - slitWidth / 2).toString());
      slit.setAttribute('width', '10');
      slit.setAttribute('height', slitWidth.toString());
      slit.setAttribute('fill', this.config.strokeColor);
      slit.setAttribute('opacity', '0.8');
      slit.classList.add('clippy-diffraction-slit');
      
      group.appendChild(slit);
    }
    
    // Draw diffraction pattern on "screen"
    const screenX = this.config.width * 0.75;
    const patternHeight = this.config.height * 0.6;
    const centerY = this.config.height / 2;
    
    for (let y = centerY - patternHeight / 2; y <= centerY + patternHeight / 2; y += 2) {
      let intensity = 0;
      
      // Calculate diffraction pattern intensity
      for (let i = 0; i < slitCount; i++) {
        const slitY = slitCenterY - (slitCount - 1) * slitSpacing / 2 + i * slitSpacing;
        const pathDiff = Math.sqrt(screenDistance ** 2 + (y - slitY) ** 2) - screenDistance;
        intensity += Math.cos(2 * Math.PI * pathDiff / 20); // Wavelength = 20
      }
      
      const normalizedIntensity = Math.abs(intensity / slitCount);
      
      if (normalizedIntensity > 0.1) {
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', screenX.toString());
        circle.setAttribute('cy', y.toString());
        circle.setAttribute('r', (normalizedIntensity * 3).toString());
        circle.setAttribute('fill', this.config.strokeColor);
        circle.setAttribute('opacity', normalizedIntensity.toString());
        circle.classList.add('clippy-diffraction-spot');
        
        group.appendChild(circle);
      }
    }

    if (this.config.animated) {
      this.animatePattern(group, 'diffraction-shimmer');
    }
  }

  /**
   * Helper method to create SVG group
   */
  private createGroup(className: string): SVGGElement {
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    group.setAttribute('class', `clippy-pattern-${className}`);
    this.svg.appendChild(group);
    return group;
  }

  /**
   * Helper method to add circle to group
   */
  private addCircle(group: SVGGElement, x: number, y: number, radius: number): void {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x.toString());
    circle.setAttribute('cy', y.toString());
    circle.setAttribute('r', radius.toString());
    circle.setAttribute('stroke', this.config.strokeColor);
    circle.setAttribute('stroke-width', this.config.strokeWidth.toString());
    circle.setAttribute('fill', this.config.fillColor || 'none');
    circle.classList.add('clippy-flower-of-life');
    
    group.appendChild(circle);
  }

  /**
   * Get the 13 circle positions for Metatron's Cube
   */
  private getMetatronsCircles(radius: number): Point[] {
    const circles: Point[] = [];
    
    // Center circle
    circles.push({ x: this.config.centerX, y: this.config.centerY });
    
    // Inner ring (6 circles)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      circles.push({
        x: this.config.centerX + Math.cos(angle) * radius,
        y: this.config.centerY + Math.sin(angle) * radius
      });
    }
    
    // Outer ring (6 circles)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + Math.PI / 6;
      circles.push({
        x: this.config.centerX + Math.cos(angle) * radius * 2,
        y: this.config.centerY + Math.sin(angle) * radius * 2
      });
    }
    
    return circles;
  }

  /**
   * Connect Metatron's Cube points
   */
  private connectMetatronsPoints(group: SVGGElement, circles: Point[]): void {
    // Connect according to Metatron's Cube pattern
    const connections = [
      [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], // Center to inner ring
      [1, 7], [2, 8], [3, 9], [4, 10], [5, 11], [6, 12], // Inner to outer
      [7, 8], [8, 9], [9, 10], [10, 11], [11, 12], [12, 7] // Outer ring
    ];
    
    connections.forEach(([i, j]) => {
      if (circles[i] && circles[j]) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', circles[i].x.toString());
        line.setAttribute('y1', circles[i].y.toString());
        line.setAttribute('x2', circles[j].x.toString());
        line.setAttribute('y2', circles[j].y.toString());
        line.setAttribute('stroke', this.config.strokeColor);
        line.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
        line.classList.add('clippy-fractal-branch');
        
        group.appendChild(line);
      }
    });
  }

  /**
   * Draw fractal tree branch recursively
   */
  private drawFractalBranch(
    group: SVGGElement,
    x: number,
    y: number,
    angle: number,
    length: number,
    depth: number,
    branchAngle: number
  ): void {
    if (depth === 0 || length < 2) return;
    
    const endX = x + Math.cos(angle) * length;
    const endY = y + Math.sin(angle) * length;
    
    // Draw branch
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x.toString());
    line.setAttribute('y1', y.toString());
    line.setAttribute('x2', endX.toString());
    line.setAttribute('y2', endY.toString());
    line.setAttribute('stroke', this.config.strokeColor);
    line.setAttribute('stroke-width', (depth * 0.5).toString());
    line.classList.add('clippy-fractal-branch');
    
    group.appendChild(line);
    
    // Recursive branches
    this.drawFractalBranch(group, endX, endY, angle - branchAngle, length * 0.7, depth - 1, branchAngle);
    this.drawFractalBranch(group, endX, endY, angle + branchAngle, length * 0.7, depth - 1, branchAngle);
  }

  /**
   * Create petal shape for mandala
   */
  private createPetal(x: number, y: number, size: number, rotation: number): SVGElement {
    const petal = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
    petal.setAttribute('cx', x.toString());
    petal.setAttribute('cy', y.toString());
    petal.setAttribute('rx', size.toString());
    petal.setAttribute('ry', (size * 2).toString());
    petal.setAttribute('stroke', this.config.strokeColor);
    petal.setAttribute('stroke-width', this.config.strokeWidth.toString());
    petal.setAttribute('fill', this.config.fillColor || 'none');
    petal.setAttribute('transform', `rotate(${rotation * 180 / Math.PI} ${x} ${y})`);
    petal.classList.add('clippy-flower-of-life');
    
    return petal;
  }

  /**
   * Create simple Voronoi cell (simplified implementation)
   */
  private createVoronoiCell(point: Point, allPoints: Point[], index: number): SVGElement | null {
    // This is a simplified version - real Voronoi would use proper algorithms
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    
    // Generate approximate cell boundary
    const cellPoints: Point[] = [];
    const angleStep = (2 * Math.PI) / 8;
    
    for (let i = 0; i < 8; i++) {
      const angle = i * angleStep;
      let distance = 50; // Default distance
      
      // Find nearest neighbor in this direction
      allPoints.forEach((otherPoint, otherIndex) => {
        if (otherIndex !== index) {
          const dx = otherPoint.x - point.x;
          const dy = otherPoint.y - point.y;
          const pointAngle = Math.atan2(dy, dx);
          const angleDiff = Math.abs(pointAngle - angle);
          
          if (angleDiff < angleStep) {
            const dist = Math.sqrt(dx * dx + dy * dy) / 2;
            distance = Math.min(distance, dist);
          }
        }
      });
      
      cellPoints.push({
        x: point.x + Math.cos(angle) * distance,
        y: point.y + Math.sin(angle) * distance
      });
    }
    
    const pointsString = cellPoints.map(p => `${p.x},${p.y}`).join(' ');
    polygon.setAttribute('points', pointsString);
    polygon.setAttribute('stroke', this.config.strokeColor);
    polygon.setAttribute('stroke-width', this.config.strokeWidth.toString());
    polygon.setAttribute('fill', this.config.fillColor || this.config.strokeColor);
    polygon.setAttribute('fill-opacity', '0.1');
    polygon.classList.add('clippy-voronoi-region');
    
    return polygon;
  }

  /**
   * Animate pattern with specified animation class
   */
  private animatePattern(group: SVGGElement, animationClass: string): void {
    group.classList.add(animationClass);
    
    if (this.config.animated && this.config.animationSpeed !== 0) {
      this.startContinuousAnimation();
    }
  }

  /**
   * Start continuous animation loop
   */
  private startContinuousAnimation(): void {
    if (this.animationFrameId) return;
    
    const animate = () => {
      const elapsed = (Date.now() - this.startTime) * this.config.animationSpeed * 0.001;
      const rotation = elapsed * 10; // Slow rotation
      
      // Apply rotation to the entire pattern
      this.svg.style.transform = `rotate(${rotation}deg)`;
      
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    animate();
  }

  /**
   * Stop animation
   */
  private stopAnimation(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Clear current pattern
   */
  public clearPattern(): void {
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<PatternConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update SVG properties
    this.svg.setAttribute('width', this.config.width.toString());
    this.svg.setAttribute('height', this.config.height.toString());
    this.svg.style.opacity = this.config.opacity.toString();
    
    // Restart animation if needed
    if (!this.config.animated) {
      this.stopAnimation();
    } else if (!this.animationFrameId) {
      this.startContinuousAnimation();
    }
  }

  /**
   * Helper methods for new sacred geometry patterns
   */

  /**
   * Add rectangle with gates (bhupura) for Sri Yantra
   */
  private addRectangleWithGates(group: SVGGElement, centerX: number, centerY: number, size: number): void {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', (centerX - size / 2).toString());
    rect.setAttribute('y', (centerY - size / 2).toString());
    rect.setAttribute('width', size.toString());
    rect.setAttribute('height', size.toString());
    rect.setAttribute('stroke', this.config.strokeColor);
    rect.setAttribute('stroke-width', this.config.strokeWidth.toString());
    rect.setAttribute('fill', 'none');
    rect.classList.add('clippy-yantra-bhupura');
    group.appendChild(rect);
  }

  /**
   * Add lotus petal ring for Sri Yantra
   */
  private addLotusRing(group: SVGGElement, centerX: number, centerY: number, radius: number, petalCount: number): void {
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * 2 * Math.PI) / petalCount;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      const petal = this.createPetal(x, y, radius / 20, angle);
      petal.classList.add('clippy-lotus-petal');
      group.appendChild(petal);
    }
  }

  /**
   * Add interlacing triangles for Sri Yantra
   */
  private addYantraTriangles(group: SVGGElement, centerX: number, centerY: number, size: number): void {
    // Simplified version - 4 upward and 5 downward triangles
    for (let i = 0; i < 4; i++) {
      const points = this.getTrianglePoints(centerX, centerY, size * (0.9 - i * 0.15), i * Math.PI / 8);
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
      triangle.setAttribute('stroke', this.config.strokeColor);
      triangle.setAttribute('stroke-width', (this.config.strokeWidth * 0.7).toString());
      triangle.setAttribute('fill', 'none');
      triangle.classList.add('clippy-yantra-triangle-up');
      group.appendChild(triangle);
    }

    for (let i = 0; i < 5; i++) {
      const points = this.getTrianglePoints(centerX, centerY, size * (0.8 - i * 0.12), Math.PI + i * Math.PI / 10);
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
      triangle.setAttribute('stroke', this.config.strokeColor);
      triangle.setAttribute('stroke-width', (this.config.strokeWidth * 0.7).toString());
      triangle.setAttribute('fill', 'none');
      triangle.classList.add('clippy-yantra-triangle-down');
      group.appendChild(triangle);
    }
  }

  /**
   * Get triangle points
   */
  private getTrianglePoints(centerX: number, centerY: number, size: number, rotation: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < 3; i++) {
      const angle = (i * 2 * Math.PI) / 3 + rotation;
      points.push({
        x: centerX + Math.cos(angle) * size,
        y: centerY + Math.sin(angle) * size
      });
    }
    return points;
  }

  /**
   * Get hexagon points for Merkaba
   */
  private getHexagonPoints(centerX: number, centerY: number, size: number): Point[] {
    const points: Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3;
      points.push({
        x: centerX + Math.cos(angle) * size,
        y: centerY + Math.sin(angle) * size
      });
    }
    return points;
  }

  /**
   * Draw dodecahedron projection
   */
  private drawDodecahedron(group: SVGGElement, size: number): void {
    // Pentagon-based dodecahedron projection
    const pentagons = 12;
    const pentagonRadius = size / 3;
    
    for (let i = 0; i < pentagons; i++) {
      const angle = (i * 2 * Math.PI) / pentagons;
      const radius = size * (0.5 + 0.3 * Math.cos(i * Math.PI / 6));
      const centerX = this.config.centerX + Math.cos(angle) * radius * 0.7;
      const centerY = this.config.centerY + Math.sin(angle) * radius * 0.7;
      
      const pentagon = this.createPentagon(centerX, centerY, pentagonRadius * (0.7 + 0.3 * Math.cos(i)));
      pentagon.setAttribute('opacity', (0.4 + 0.4 * Math.cos(i)).toString());
      group.appendChild(pentagon);
    }
  }

  /**
   * Draw icosahedron projection
   */
  private drawIcosahedron(group: SVGGElement, size: number): void {
    // Triangle-based icosahedron projection
    const triangles = 20;
    const triangleSize = size / 4;
    
    for (let i = 0; i < triangles; i++) {
      const angle = (i * 2 * Math.PI) / triangles;
      const radius = size * (0.3 + 0.4 * Math.cos(i * Math.PI / 10));
      const centerX = this.config.centerX + Math.cos(angle) * radius;
      const centerY = this.config.centerY + Math.sin(angle) * radius;
      
      const points = this.getTrianglePoints(centerX, centerY, triangleSize, angle);
      const triangle = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      triangle.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
      triangle.setAttribute('stroke', this.config.strokeColor);
      triangle.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
      triangle.setAttribute('fill', 'none');
      triangle.setAttribute('opacity', (0.3 + 0.5 * Math.cos(i)).toString());
      triangle.classList.add('clippy-icosahedron-face');
      group.appendChild(triangle);
    }
  }

  /**
   * Draw tetrahedron projection
   */
  private drawTetrahedron(group: SVGGElement, size: number): void {
    // Simple tetrahedron as overlapping triangles
    const triangleSize = size;
    
    // Front face
    const points1 = this.getTrianglePoints(this.config.centerX, this.config.centerY, triangleSize, 0);
    const triangle1 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    triangle1.setAttribute('points', points1.map(p => `${p.x},${p.y}`).join(' '));
    triangle1.setAttribute('stroke', this.config.strokeColor);
    triangle1.setAttribute('stroke-width', this.config.strokeWidth.toString());
    triangle1.setAttribute('fill', 'none');
    triangle1.classList.add('clippy-tetrahedron-front');
    group.appendChild(triangle1);
    
    // Back face (smaller, offset)
    const points2 = this.getTrianglePoints(this.config.centerX + 20, this.config.centerY - 20, triangleSize * 0.7, Math.PI);
    const triangle2 = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    triangle2.setAttribute('points', points2.map(p => `${p.x},${p.y}`).join(' '));
    triangle2.setAttribute('stroke', this.config.strokeColor);
    triangle2.setAttribute('stroke-width', (this.config.strokeWidth * 0.7).toString());
    triangle2.setAttribute('fill', 'none');
    triangle2.setAttribute('opacity', '0.6');
    triangle2.classList.add('clippy-tetrahedron-back');
    group.appendChild(triangle2);
  }

  /**
   * Create pentagon shape
   */
  private createPentagon(centerX: number, centerY: number, radius: number): SVGElement {
    const points: Point[] = [];
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      points.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius
      });
    }
    
    const pentagon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    pentagon.setAttribute('points', points.map(p => `${p.x},${p.y}`).join(' '));
    pentagon.setAttribute('stroke', this.config.strokeColor);
    pentagon.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
    pentagon.setAttribute('fill', 'none');
    pentagon.classList.add('clippy-pentagon');
    
    return pentagon;
  }

  /**
   * Get Sephirot positions for Tree of Life
   */
  private getSephirotPositions(size: number): Point[] {
    const centerX = this.config.centerX;
    const centerY = this.config.centerY;
    const spacing = size / 6;
    
    return [
      { x: centerX, y: centerY - spacing * 3 },              // 1. Kether
      { x: centerX - spacing, y: centerY - spacing * 2 },    // 2. Chokmah
      { x: centerX + spacing, y: centerY - spacing * 2 },    // 3. Binah
      { x: centerX - spacing, y: centerY - spacing },        // 4. Chesed
      { x: centerX + spacing, y: centerY - spacing },        // 5. Geburah
      { x: centerX, y: centerY },                            // 6. Tiphereth
      { x: centerX - spacing, y: centerY + spacing },        // 7. Netzach
      { x: centerX + spacing, y: centerY + spacing },        // 8. Hod
      { x: centerX, y: centerY + spacing * 2 },              // 9. Yesod
      { x: centerX, y: centerY + spacing * 3 }               // 10. Malkuth
    ];
  }

  /**
   * Draw paths between Sephirot
   */
  private drawTreePaths(group: SVGGElement, sephirot: Point[]): void {
    // The 22 paths of the Tree of Life
    const paths = [
      [0, 1], [0, 2], [1, 2], [1, 3], [1, 5], [2, 4], [2, 5],
      [3, 4], [3, 5], [3, 6], [4, 5], [4, 7], [5, 6], [5, 7], [5, 8],
      [6, 7], [6, 8], [6, 9], [7, 8], [7, 9], [8, 9], [3, 9]
    ];
    
    paths.forEach(([i, j]) => {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sephirot[i].x.toString());
      line.setAttribute('y1', sephirot[i].y.toString());
      line.setAttribute('x2', sephirot[j].x.toString());
      line.setAttribute('y2', sephirot[j].y.toString());
      line.setAttribute('stroke', this.config.strokeColor);
      line.setAttribute('stroke-width', (this.config.strokeWidth * 0.5).toString());
      line.setAttribute('opacity', '0.7');
      line.classList.add('clippy-tree-path');
      group.appendChild(line);
    });
  }

  /**
   * Create torus flow line
   */
  private createTorusFlowLine(angle: number, majorRadius: number, minorRadius: number): SVGElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Create flowing curve through torus
    const startX = this.config.centerX + Math.cos(angle) * (majorRadius + minorRadius);
    const startY = this.config.centerY + Math.sin(angle) * (majorRadius + minorRadius) * 0.3;
    const endX = this.config.centerX + Math.cos(angle + Math.PI) * (majorRadius + minorRadius);
    const endY = this.config.centerY + Math.sin(angle + Math.PI) * (majorRadius + minorRadius) * 0.3;
    
    const controlX1 = this.config.centerX + Math.cos(angle + Math.PI/2) * minorRadius;
    const controlY1 = this.config.centerY + Math.sin(angle + Math.PI/2) * minorRadius;
    const controlX2 = this.config.centerX + Math.cos(angle - Math.PI/2) * minorRadius;
    const controlY2 = this.config.centerY + Math.sin(angle - Math.PI/2) * minorRadius;
    
    const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1} ${controlX2} ${controlY2} ${endX} ${endY}`;
    
    path.setAttribute('d', pathData);
    path.setAttribute('stroke', this.config.strokeColor);
    path.setAttribute('stroke-width', (this.config.strokeWidth * 0.3).toString());
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.5');
    path.classList.add('clippy-torus-flow');
    
    return path;
  }

  /**
   * Cleanup
   */
  public destroy(): void {
    this.stopAnimation();
    this.clearPattern();
    
    if (this.svg && this.svg.parentNode) {
      this.svg.parentNode.removeChild(this.svg);
    }
    
    console.log('🔮 Geometric pattern generator destroyed');
  }
}