/**
 * joystick.js — Controlador del Joystick circular táctil y con mouse (Pointer Events)
 * Mapea gestos en 4 cuadrantes hacia AVANZAR, RETROCEDER, IZQUIERDA, DERECHA y DETENER en centro/liberación.
 * Autor: Luis Carlos Márquez Strociak · 2026
 */

import { COMMANDS } from './config.js';

export class VirtualJoystick {
  /**
   * @param {HTMLElement} baseElement - Contenedor circular del joystick
   * @param {HTMLElement} handleElement - Pomo o elemento móvil
   * @param {Function} onDirectionChange - Callback invocado al cambiar el comando efectivo
   */
  constructor(baseElement, handleElement, onDirectionChange) {
    this.base = baseElement;
    this.handle = handleElement;
    this.onDirectionChange = onDirectionChange;

    this.isActive = false;
    this.activePointerId = null;
    this.currentCommand = null; // null = centro/neutral

    // Elementos visuales de dirección cardinal
    this.dirIndicators = {
      [COMMANDS.AVANZAR]: this.base.querySelector('.dir-up'),
      [COMMANDS.RETROCEDER]: this.base.querySelector('.dir-down'),
      [COMMANDS.GIRAR_IZQUIERDA]: this.base.querySelector('.dir-left'),
      [COMMANDS.GIRAR_DERECHA]: this.base.querySelector('.dir-right'),
    };

    this.initEvents();
  }

  initEvents() {
    this.base.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    this.base.addEventListener('pointermove', (e) => this.onPointerMove(e));
    this.base.addEventListener('pointerup', (e) => this.onPointerUp(e));
    this.base.addEventListener('pointercancel', (e) => this.onPointerUp(e));
  }

  onPointerDown(e) {
    if (this.isActive) return;
    this.isActive = true;
    this.activePointerId = e.pointerId;
    this.base.setPointerCapture(e.pointerId);
    this.updatePosition(e);
  }

  onPointerMove(e) {
    if (!this.isActive || e.pointerId !== this.activePointerId) return;
    this.updatePosition(e);
  }

  onPointerUp(e) {
    if (!this.isActive || e.pointerId !== this.activePointerId) return;
    this.isActive = false;
    this.activePointerId = null;
    try {
      this.base.releasePointerCapture(e.pointerId);
    } catch (err) {}

    // Restablece el centro físico y emite DETENER
    this.resetCenter();
  }

  updatePosition(e) {
    const rect = this.base.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let dx = e.clientX - centerX;
    let dy = e.clientY - centerY;

    const maxR = (rect.width / 2) - 38; // Limita movimiento dentro del anillo
    const distance = Math.hypot(dx, dy);

    // Limitar pomo al perímetro del círculo
    if (distance > maxR) {
      dx = (dx / distance) * maxR;
      dy = (dy / distance) * maxR;
    }

    // Mover pomo visualmente
    this.handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    // Determinar cuadrante activo
    const deadzone = maxR * 0.28; // 28% umbral de zona neutral
    let newCommand = null;

    if (distance >= deadzone) {
      // Ángulo en grados (-180 a 180)
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);

      if (angle >= -135 && angle <= -45) {
        newCommand = COMMANDS.AVANZAR; // Norte
      } else if (angle >= 45 && angle <= 135) {
        newCommand = COMMANDS.RETROCEDER; // Sur
      } else if ((angle > 135 && angle <= 180) || (angle >= -180 && angle < -135)) {
        newCommand = COMMANDS.GIRAR_IZQUIERDA; // Oeste
      } else {
        newCommand = COMMANDS.GIRAR_DERECHA; // Este
      }
    }

    // Evitar ráfagas: solo emitir acción si el comando efectivo cambió
    if (newCommand !== this.currentCommand) {
      this.currentCommand = newCommand;
      this.updateDirectionUI(newCommand);
      this.onDirectionChange(newCommand);
    }
  }

  resetCenter() {
    this.handle.style.transform = 'translate(-50%, -50%)';
    const previousCommand = this.currentCommand;
    this.currentCommand = null;
    this.updateDirectionUI(null);

    // Si había un movimiento activo, solicita DETENER (código 9)
    if (previousCommand !== null) {
      this.onDirectionChange(COMMANDS.DETENER);
    }
  }

  updateDirectionUI(activeCommand) {
    Object.entries(this.dirIndicators).forEach(([cmd, el]) => {
      if (!el) return;
      if (parseInt(cmd, 10) === activeCommand) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });
  }

  disable() {
    this.resetCenter();
    this.base.style.opacity = '0.4';
    this.base.style.pointerEvents = 'none';
  }

  enable() {
    this.base.style.opacity = '1';
    this.base.style.pointerEvents = 'auto';
  }
}
