class WeatherGlassCard extends HTMLElement {
  setConfig(config) {
    this.config = config;
    this.hass = undefined;
    this.animationFrame = null;
    this.particles = [];
    this.ambientLights = [];
    this.gamingMode = false;
  }

  set hass(hass) {
    this._hass = hass;
    this.update();
  }

  get hass() {
    return this._hass;
  }

  update() {
    if (!this.hass) return;

    const {
      weather_entity,
      temperature_entity,
      humidity_entity,
      air_quality_entity,
      wind_entity,
      uv_entity,
      pollen_entity,
      cloud_coverage_entity,
      house_image,
      room_badges
    } = this.config;

    const weatherState = weather_entity ? this.hass.states[weather_entity] : null;
    const tempState = temperature_entity ? this.hass.states[temperature_entity] : null;
    const humidityState = humidity_entity ? this.hass.states[humidity_entity] : null;
    const airQualityState = air_quality_entity ? this.hass.states[air_quality_entity] : null;
    const windState = wind_entity ? this.hass.states[wind_entity] : null;
    const uvState = uv_entity ? this.hass.states[uv_entity] : null;
    const pollenState = pollen_entity ? this.hass.states[pollen_entity] : null;
    const cloudCoverageState = cloud_coverage_entity ? this.hass.states[cloud_coverage_entity] : null;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
      this.shadowRoot.innerHTML = this.getHtml();
      this.initializeCanvas();
      this.startAnimation();
      this.setupEventListeners();
    }

    this.updateValues(weatherState, tempState, humidityState, airQualityState, windState, uvState, pollenState, cloudCoverageState);
    this.updateAIAdvisor(weatherState, tempState, windState, uvState, airQualityState, pollenState);
    this.updateWeatherEngine(weatherState, windState, cloudCoverageState);
    this.updateDayNightCycle(weatherState);
    this.updateRoomBadges(room_badges);
  }

  updateValues(weather, temp, humidity, airQuality, wind, uv, pollen, cloudCoverage) {
    const root = this.shadowRoot;

    if (temp && root.querySelector('[data-temp]')) {
      root.querySelector('[data-temp]').textContent = `${temp.state}${temp.attributes.unit_of_measurement || '°C'}`;
    }

    if (humidity && root.querySelector('[data-humidity]')) {
      root.querySelector('[data-humidity]').textContent = `${humidity.state}%`;
    }

    if (weather) {
      const weatherIcon = root.querySelector('[data-weather-icon]');
      if (weatherIcon) {
        weatherIcon.textContent = this.getWeatherIcon(weather.state);
      }

      const condition = root.querySelector('[data-weather-condition]');
      if (condition) {
        condition.textContent = this.getWeatherText(weather.state);
      }
    }

    if (airQuality && root.querySelector('[data-air-quality]')) {
      const level = root.querySelector('[data-air-quality]');
      const value = parseFloat(airQuality.state);
      level.textContent = this.getAirQualityLevel(value);
      level.style.color = this.getAirQualityColor(value);
    }

    if (wind && root.querySelector('[data-wind]')) {
      root.querySelector('[data-wind]').textContent = `${wind.state} m/s`;
    }

    if (uv && root.querySelector('[data-uv]')) {
      const uvValue = parseFloat(uv.state);
      root.querySelector('[data-uv]').textContent = this.getUVLevel(uvValue);
      root.querySelector('[data-uv]').style.color = this.getUVColor(uvValue);
    }

    if (pollen && root.querySelector('[data-pollen]')) {
      const pollenValue = parseFloat(pollen.state);
      root.querySelector('[data-pollen]').textContent = this.getPollenLevel(pollenValue);
    }
  }

  updateAIAdvisor(weather, temp, wind, uv, airQuality, pollen) {
    const advisorElement = this.shadowRoot.querySelector('[data-ai-advisor]');
    if (!advisorElement) return;

    const advice = this.generateAIAdvice(weather, temp, wind, uv, airQuality, pollen);
    advisorElement.innerHTML = advice;
  }

  generateAIAdvice(weather, temp, wind, uv, airQuality, pollen) {
    let advice = [];

    if (temp && wind) {
      const tempValue = parseFloat(temp.state);
      const windValue = parseFloat(wind.state);
      const windChill = this.calculateWindChill(tempValue, windValue);

      if (windChill < tempValue - 3) {
        advice.push(`<div class="advice-item warning">🌬️ 风寒警告: 温度 ${tempValue}°C，但由于强风感觉像 ${windChill.toFixed(1)}°C</div>`);
      }
    }

    if (uv) {
      const uvValue = parseFloat(uv.state);
      if (uvValue >= 8) {
        advice.push(`<div class="advice-item danger">☀️ 紫外线危险: UV 指数 ${uvValue}，建议穿长袖、防晒霜并避免中午外出</div>`);
      } else if (uvValue >= 6) {
        advice.push(`<div class="advice-item warning">☀️ 紫外线高: UV 指数 ${uvValue}，建议使用防晒霜</div>`);
      }
    }

    if (airQuality) {
      const aqiValue = parseFloat(airQuality.state);
      if (aqiValue > 150) {
        advice.push(`<div class="advice-item danger">🌫️ 空气质量差: AQI ${aqiValue}，建议减少户外活动并佩戴口罩</div>`);
      } else if (aqiValue > 100) {
        advice.push(`<div class="advice-item warning">🌫️ 空气质量不佳: AQI ${aqiValue}，敏感人群应减少户外活动</div>`);
      }
    }

    if (pollen) {
      const pollenValue = parseFloat(pollen.state);
      if (pollenValue > 50) {
        advice.push(`<div class="advice-item warning">🌸 花粉高: 花粉浓度 ${pollenValue}，过敏人群注意防护</div>`);
      }
    }

    if (weather) {
      const condition = weather.state;
      if (condition === 'rainy' || condition === 'pouring') {
        advice.push(`<div class="advice-item info">🌧️ 下雨天气: 记得带伞，路面可能湿滑</div>`);
      } else if (condition === 'snowy') {
        advice.push(`<div class="advice-item info">❄️ 下雪天气: 注意保暖，路面可能结冰</div>`);
      } else if (condition === 'sunny') {
        advice.push(`<div class="advice-item info">☀️ 晴朗天气: 适合户外活动，别忘了防晒</div>`);
      }
    }

    return advice.length > 0 ? advice.join('') : '<div class="advice-item info">✅ 天气状况良好，适合正常活动</div>';
  }

  calculateWindChill(temp, windSpeed) {
    // Simplified wind chill formula
    if (temp > 10 || windSpeed < 4.8) return temp;
    return 13.12 + 0.6215 * temp - 11.37 * Math.pow(windSpeed, 0.16) + 0.3965 * temp * Math.pow(windSpeed, 0.16);
  }

  getUVLevel(value) {
    if (value <= 2) return '低';
    if (value <= 5) return '中等';
    if (value <= 7) return '高';
    if (value <= 10) return '很高';
    return '极高';
  }

  getUVColor(value) {
    if (value <= 2) return '#00ff00';
    if (value <= 5) return '#ffff00';
    if (value <= 7) return '#ffa500';
    if (value <= 10) return '#ff0000';
    return '#8b0000';
  }

  getPollenLevel(value) {
    if (value <= 20) return '低';
    if (value <= 50) return '中等';
    if (value <= 100) return '高';
    return '很高';
  }

  initializeCanvas() {
    const canvas = this.shadowRoot.querySelector('#weather-canvas');
    if (canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resizeCanvas();
      window.addEventListener('resize', () => this.resizeCanvas());
    }
  }

  resizeCanvas() {
    if (this.canvas) {
      const rect = this.canvas.getBoundingClientRect();
      this.canvas.width = rect.width;
      this.canvas.height = rect.height;
    }
  }

  startAnimation() {
    if (this.animationFrame) return;
    this.animate();
  }

  animate() {
    if (!this.ctx || !this.shadowRoot) return; // Check if component still exists
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.updateParticles();
    this.drawParticles();
    this.drawAmbientLights();
    this.animationFrame = requestAnimationFrame(() => this.animate());
  }

  disconnectedCallback() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  updateParticles() {
    // Update particle positions based on wind
    const windSpeed = this.config.wind_entity ? parseFloat(this.hass.states[this.config.wind_entity]?.state || 0) : 0;

    this.particles.forEach(particle => {
      particle.x += particle.vx + windSpeed * 0.1;
      particle.y += particle.vy;

      // Reset particles when they go off screen
      if (particle.type === 'star') {
        // Stars don't move, just twinkle
        particle.twinkle += 0.1;
      } else if (particle.y > this.canvas.height + 10) {
        // Reset falling particles
        particle.y = -10;
        particle.x = Math.random() * this.canvas.width;
      } else if (particle.x < -10 || particle.x > this.canvas.width + 10) {
        // Reset particles that go off sides
        particle.x = Math.random() * this.canvas.width;
        particle.y = Math.random() * this.canvas.height;
      }
    });
  }

  drawParticles() {
    this.particles.forEach(particle => {
      switch (particle.type) {
        case 'rain':
          this.ctx.fillStyle = 'rgba(200, 200, 255, 0.6)';
          this.ctx.fillRect(particle.x, particle.y, 1, particle.size * 2);
          break;
        case 'snow':
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'fog':
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        case 'star':
          // Twinkling effect
          const twinkle = Math.sin(particle.twinkle + Date.now() * 0.005) * 0.5 + 0.5;
          this.ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + twinkle * 0.5})`;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;
        default:
          this.ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
      }
    });
  }

  drawAmbientLights() {
    if (!this.gamingMode) return;

    this.ambientLights.forEach(light => {
      const gradient = this.ctx.createRadialGradient(light.x, light.y, 0, light.x, light.y, light.radius);
      gradient.addColorStop(0, light.color + '40');
      gradient.addColorStop(1, 'transparent');

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(light.x, light.y, light.radius, 0, Math.PI * 2);
      this.ctx.fill();

      light.x += light.vx;
      light.y += light.vy;

      if (light.x < -light.radius || light.x > this.canvas.width + light.radius) light.vx *= -1;
      if (light.y < -light.radius || light.y > this.canvas.height + light.radius) light.vy *= -1;
    });
  }

  updateWeatherEngine(weather, wind, cloudCoverage) {
    if (!this.canvas) return;

    const condition = weather?.state;
    const windSpeed = wind ? parseFloat(wind.state) : 0;
    const cloudDensity = cloudCoverage ? parseFloat(cloudCoverage.state) / 100 : 0.3;

    this.particles = [];

    if (condition === 'rainy' || condition === 'pouring') {
      // Add rain particles
      for (let i = 0; i < 50; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: windSpeed * 0.5,
          vy: 5 + Math.random() * 3,
          size: 1 + Math.random() * 2,
          type: 'rain'
        });
      }
    } else if (condition === 'snowy' || condition === 'sleet') {
      // Add snow particles
      for (let i = 0; i < 30; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: windSpeed * 0.3,
          vy: 1 + Math.random() * 2,
          size: 2 + Math.random() * 3,
          type: 'snow'
        });
      }
    }

    // Add fog particles for foggy weather
    if (condition === 'fog') {
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          vx: windSpeed * 0.1,
          vy: 0.5,
          size: 5 + Math.random() * 10,
          type: 'fog'
        });
      }
    }

    // Add stars for clear night
    if ((condition === 'clear-night' || condition === 'sunny') && this.isNightTime()) {
      for (let i = 0; i < 20; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height * 0.6, // Only upper part
          vx: 0,
          vy: 0,
          size: 1 + Math.random(),
          type: 'star',
          twinkle: Math.random() * Math.PI * 2
        });
      }
    }
  }

  isNightTime() {
    const now = new Date();
    const hour = now.getHours();
    return hour < 6 || hour > 22;
  }

  updateDayNightCycle(weather) {
    const houseImage = this.shadowRoot.querySelector('.house-image');
    if (!houseImage) return;

    const isNight = this.isNightTime() || weather?.state === 'clear-night';
    houseImage.style.filter = isNight ? 'brightness(0.4) contrast(0.8)' : 'brightness(1) contrast(1)';
  }

  updateRoomBadges(roomBadges) {
    if (!roomBadges) return;

    const container = this.shadowRoot.querySelector('.room-badges');
    if (!container) return;

    container.innerHTML = '';

    roomBadges.forEach(badge => {
      const badgeElement = document.createElement('div');
      badgeElement.className = 'room-badge';
      badgeElement.style.left = badge.x + '%';
      badgeElement.style.top = badge.y + '%';

      const tempEntity = this.hass.states[badge.temperature_entity];
      const temp = tempEntity ? `${tempEntity.state}°C` : '--°C';

      badgeElement.innerHTML = `
        <div class="badge-label">${badge.name}</div>
        <div class="badge-temp">${temp}</div>
      `;

      container.appendChild(badgeElement);
    });
  }

  setupEventListeners() {
    const gamingToggle = this.shadowRoot.querySelector('.gaming-toggle');
    if (gamingToggle) {
      gamingToggle.addEventListener('click', () => this.toggleGamingMode());
    }
  }

  getHtml() {
    return `
      <div class="glass-card">
        <style>${this.getStyles()}</style>

        <div class="header">
          <h2>${this.config.title || '气候监控'}</h2>
          <button class="gaming-toggle">🎮</button>
        </div>

        <div class="content">
          <div class="weather-section">
            <div class="weather-icon" data-weather-icon>🌤️</div>
            <div class="weather-info">
              <div class="condition" data-weather-condition>晴朗</div>
              <div class="temperature">
                <span data-temp>--°C</span>
              </div>
            </div>
          </div>

          <div class="ai-advisor-section">
            <div class="advisor-title">🧠 AI 智能建议</div>
            <div class="advisor-content" data-ai-advisor>
              <div class="advice-item info">✅ 天气状况良好，适合正常活动</div>
            </div>
          </div>

          <div class="metrics-grid">
            <div class="metric-card">
              <div class="metric-label">湿度</div>
              <div class="metric-value" data-humidity>--%</div>
              <div class="metric-icon">💧</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">空气质量</div>
              <div class="metric-value" data-air-quality>--</div>
              <div class="metric-icon">🌬️</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">风速</div>
              <div class="metric-value" data-wind>-- m/s</div>
              <div class="metric-icon">🌪️</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">紫外线</div>
              <div class="metric-value" data-uv>--</div>
              <div class="metric-icon">☀️</div>
            </div>

            <div class="metric-card">
              <div class="metric-label">花粉</div>
              <div class="metric-value" data-pollen>--</div>
              <div class="metric-icon">🌸</div>
            </div>
          </div>

          <div class="house-section">
            <div class="house-container">
              ${this.config.house_image ? `<img src="${this.config.house_image}" class="house-image" alt="House">` : '<div class="house-placeholder">🏠</div>'}
              <canvas id="weather-canvas" class="weather-canvas"></canvas>
              <div class="room-badges"></div>
            </div>
          </div>

          <div class="forecast-section">
            <div class="forecast-title">详细信息</div>
            <div class="forecast-grid">
              <div class="forecast-item">
                <span class="label">体感温度</span>
                <span class="value">--°C</span>
              </div>
              <div class="forecast-item">
                <span class="label">风速</span>
                <span class="value">-- m/s</span>
              </div>
              <div class="forecast-item">
                <span class="label">气压</span>
                <span class="value">-- hPa</span>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">
          <span class="last-update">最后更新: 现在</span>
        </div>
      </div>
    `;
  }

  getStyles() {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      .glass-card {
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.15) 100%);
        backdrop-filter: blur(10px) saturate(180%);
        -webkit-backdrop-filter: blur(10px) saturate(180%);
        border-radius: 20px;
        border: 1px solid rgba(255, 255, 255, 0.18);
        padding: 24px;
        box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.37);
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #1a1a1a;
        max-width: 500px;
        margin: 16px auto;
      }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.3);
        padding-bottom: 12px;
      }

      .header h2 {
        font-size: 24px;
        font-weight: 600;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin: 0;
      }

      .gaming-toggle {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%);
        border: 1px solid rgba(102, 126, 234, 0.3);
        border-radius: 8px;
        padding: 8px 12px;
        color: #667eea;
        cursor: pointer;
        font-size: 16px;
        transition: all 0.3s ease;
      }

      .gaming-toggle:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.3) 0%, rgba(118, 75, 162, 0.3) 100%);
        transform: scale(1.05);
      }

      .ai-advisor-section {
        padding: 16px;
        background: linear-gradient(135deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 165, 0, 0.1) 100%);
        border-radius: 12px;
        border: 1px solid rgba(255, 215, 0, 0.2);
        backdrop-filter: blur(10px);
      }

      .advisor-title {
        font-size: 16px;
        font-weight: 600;
        color: #ff8c00;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .advisor-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .advice-item {
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 14px;
        line-height: 1.4;
      }

      .advice-item.info {
        background: rgba(0, 255, 0, 0.1);
        border-left: 4px solid #00ff00;
        color: #006400;
      }

      .advice-item.warning {
        background: rgba(255, 255, 0, 0.1);
        border-left: 4px solid #ffff00;
        color: #8b8000;
      }

      .advice-item.danger {
        background: rgba(255, 0, 0, 0.1);
        border-left: 4px solid #ff0000;
        color: #8b0000;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 12px;
      }

      .house-section {
        margin: 20px 0;
      }

      .house-container {
        position: relative;
        width: 100%;
        height: 200px;
        border-radius: 12px;
        overflow: hidden;
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        backdrop-filter: blur(10px);
      }

      .house-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: filter 1s ease;
      }

      .house-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 48px;
        color: rgba(102, 126, 234, 0.5);
      }

      .weather-canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .room-badges {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
      }

      .room-badge {
        position: absolute;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 8px;
        padding: 6px 8px;
        backdrop-filter: blur(10px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        text-align: center;
        min-width: 60px;
        pointer-events: auto;
      }

      .badge-label {
        font-size: 10px;
        color: #666;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .badge-temp {
        font-size: 12px;
        font-weight: 700;
        color: #1a1a1a;
      }

      .content {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .weather-section {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.15) 0%, rgba(255, 255, 255, 0.08) 100%);
        border-radius: 15px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(10px);
      }

      .weather-icon {
        font-size: 64px;
        min-width: 80px;
        text-align: center;
        filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.1));
      }

      .weather-info {
        flex: 1;
        margin-left: 16px;
      }

      .condition {
        font-size: 18px;
        font-weight: 500;
        margin-bottom: 8px;
        color: #667eea;
      }

      .temperature {
        font-size: 32px;
        font-weight: 700;
        color: #1a1a1a;
        text-shadow: 0 2px 4px rgba(255, 255, 255, 0.5);
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .metric-card {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%);
        border: 1px solid rgba(102, 126, 234, 0.2);
        border-radius: 12px;
        padding: 16px;
        text-align: center;
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
      }

      .metric-card:hover {
        background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
        border-color: rgba(102, 126, 234, 0.3);
        transform: translateY(-2px);
      }

      .metric-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 8px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .metric-value {
        font-size: 24px;
        font-weight: 700;
        color: #1a1a1a;
        margin-bottom: 8px;
      }

      .metric-icon {
        font-size: 24px;
      }

      .forecast-section {
        padding: 16px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        border-radius: 12px;
        border: 1px solid rgba(255, 255, 255, 0.15);
        backdrop-filter: blur(10px);
      }

      .forecast-title {
        font-size: 14px;
        font-weight: 600;
        color: #667eea;
        margin-bottom: 12px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .forecast-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }

      .forecast-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.1);
      }

      .forecast-item .label {
        font-size: 11px;
        color: #888;
        font-weight: 500;
      }

      .forecast-item .value {
        font-size: 14px;
        font-weight: 700;
        color: #1a1a1a;
      }

      .footer {
        text-align: center;
        font-size: 12px;
        color: #999;
        padding-top: 12px;
        border-top: 1px solid rgba(255, 255, 255, 0.2);
      }

      .last-update {
        display: inline-block;
        padding: 4px 12px;
        background: rgba(102, 126, 234, 0.1);
        border-radius: 12px;
        border: 1px solid rgba(102, 126, 234, 0.2);
      }

      @media (max-width: 600px) {
        .glass-card {
          padding: 16px;
          border-radius: 16px;
        }

        .weather-section {
          flex-direction: column;
          text-align: center;
        }

        .weather-info {
          margin-left: 0;
          margin-top: 12px;
        }

        .temperature {
          font-size: 28px;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }
      }
    `;
  }

  getWeatherIcon(condition) {
    const icons = {
      'sunny': '☀️',
      'clear-night': '🌙',
      'cloudy': '☁️',
      'rainy': '🌧️',
      'snowy': '❄️',
      'sleet': '🌨️',
      'pouring': '⛈️',
      'windy': '💨',
      'fog': '🌫️',
      'partlycloudy': '⛅'
    };
    return icons[condition] || '🌤️';
  }

  getWeatherText(condition) {
    const conditions = {
      'sunny': '晴朗',
      'clear-night': '晴夜',
      'cloudy': '多云',
      'rainy': '下雨',
      'snowy': '下雪',
      'sleet': '雨夹雪',
      'pouring': '倾盆大雨',
      'windy': '有风',
      'fog': '有雾',
      'partlycloudy': '部分多云'
    };
    return conditions[condition] || '未知';
  }

  getAirQualityLevel(value) {
    if (value <= 50) return '优秀';
    if (value <= 100) return '良好';
    if (value <= 150) return '轻度污染';
    if (value <= 200) return '中度污染';
    if (value <= 300) return '重度污染';
    return '严重污染';
  }

  getAirQualityColor(value) {
    if (value <= 50) return '#00ff00';
    if (value <= 100) return '#90ee90';
    if (value <= 150) return '#ffff00';
    if (value <= 200) return '#ffa500';
    if (value <= 300) return '#ff0000';
    return '#8b0000';
  }

  static getConfigElement() {
    let element = document.createElement('weather-glass-card-editor');
    return element;
  }

  static getStubConfig() {
    return {
      title: '气候监控',
      weather_entity: 'weather.home',
      temperature_entity: 'sensor.living_room_temperature',
      humidity_entity: 'sensor.living_room_humidity',
      air_quality_entity: 'sensor.air_quality_index',
      wind_entity: 'sensor.wind_speed',
      uv_entity: 'sensor.uv_index',
      pollen_entity: 'sensor.pollen_count',
      cloud_coverage_entity: 'sensor.cloud_coverage',
      house_image: '/local/house.jpg',
      room_badges: [
        {
          name: '客厅',
          temperature_entity: 'sensor.living_room_temperature',
          x: 30,
          y: 40
        },
        {
          name: '卧室',
          temperature_entity: 'sensor.bedroom_temperature',
          x: 70,
          y: 35
        }
      ]
    };
  }
}

if (!customElements.get("weather-glass-card")) {
  customElements.define('weather-glass-card', WeatherGlassCard);
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'weather-glass-card',
  name: 'Weather Glass Card',
  description: 'Glassmorphism-styled weather card with climate monitoring',
  preview: true,
  documentationURL: 'https://github.com/greenmini/weather-glass-card'
});
