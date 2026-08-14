import { LitElement, html, css } from "https://unpkg.com/lit@2.0.2?module";

class WeatherGlassCardEditor extends LitElement {
  static get properties() {
    return {
      hass: {},
      config: {}
    };
  }

  setConfig(config) {
    this.config = config;
  }

  get _title() {
    return this.config.title || '';
  }

  get _weather_entity() {
    return this.config.weather_entity || '';
  }

  get _temperature_entity() {
    return this.config.temperature_entity || '';
  }

  get _humidity_entity() {
    return this.config.humidity_entity || '';
  }

  get _air_quality_entity() {
    return this.config.air_quality_entity || '';
  }

  render() {
    return html`
      <div class="editor-container">
        <div class="form-group">
          <label>卡片标题</label>
          <input
            type="text"
            value="${this._title}"
            @change="${this._handleTitleChange}"
            placeholder="气候监控"
          />
        </div>

        <div class="form-group">
          <label>天气实体 <span class="required">*</span></label>
          <select @change="${this._handleWeatherChange}">
            <option value="">选择天气实体...</option>
            ${this._getWeatherEntities().map(
              entity => html`<option value="${entity}" ?selected="${entity === this._weather_entity}">${entity}</option>`
            )}
          </select>
        </div>

        <div class="form-group">
          <label>温度传感器 <span class="required">*</span></label>
          <select @change="${this._handleTempChange}">
            <option value="">选择温度传感器...</option>
            ${this._getSensorEntities().map(
              entity => html`<option value="${entity}" ?selected="${entity === this._temperature_entity}">${entity}</option>`
            )}
          </select>
        </div>

        <div class="form-group">
          <label>湿度传感器 <span class="required">*</span></label>
          <select @change="${this._handleHumidityChange}">
            <option value="">选择湿度传感器...</option>
            ${this._getSensorEntities().map(
              entity => html`<option value="${entity}" ?selected="${entity === this._humidity_entity}">${entity}</option>`
            )}
          </select>
        </div>

        <div class="form-group">
          <label>空气质量实体</label>
          <select @change="${this._handleAirQualityChange}">
            <option value="">选择空气质量实体...</option>
            ${this._getSensorEntities().map(
              entity => html`<option value="${entity}" ?selected="${entity === this._air_quality_entity}">${entity}</option>`
            )}
          </select>
        </div>
      </div>
    `;
  }

  _getWeatherEntities() {
    if (!this.hass) return [];
    return Object.keys(this.hass.states).filter(
      entity => entity.startsWith('weather.')
    );
  }

  _getSensorEntities() {
    if (!this.hass) return [];
    return Object.keys(this.hass.states).filter(
      entity => entity.startsWith('sensor.')
    );
  }

  _handleTitleChange(e) {
    this._updateConfig({
      ...this.config,
      title: e.target.value
    });
  }

  _handleWeatherChange(e) {
    this._updateConfig({
      ...this.config,
      weather_entity: e.target.value
    });
  }

  _handleTempChange(e) {
    this._updateConfig({
      ...this.config,
      temperature_entity: e.target.value
    });
  }

  _handleHumidityChange(e) {
    this._updateConfig({
      ...this.config,
      humidity_entity: e.target.value
    });
  }

  _handleAirQualityChange(e) {
    this._updateConfig({
      ...this.config,
      air_quality_entity: e.target.value
    });
  }

  _updateConfig(config) {
    this.config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true
    }));
  }

  static get styles() {
    return css`
      .editor-container {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
        border-radius: 8px;
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      label {
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }

      .required {
        color: #ff6b6b;
        margin-left: 4px;
      }

      input,
      select {
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        font-family: inherit;
        background: rgba(255, 255, 255, 0.9);
        color: #333;
        transition: all 0.3s ease;
      }

      input:focus,
      select:focus {
        outline: none;
        border-color: #667eea;
        background: white;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
      }

      input::placeholder {
        color: #999;
      }
    `;
  }
}

if (!customElements.get("weather-glass-card-editor")) {
  customElements.define('weather-glass-card-editor', WeatherGlassCardEditor);
}
