import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TUTORIALES } from '../utils/tutorialConfig';

const STORAGE_PREFIX = 'centhrix_tour_';

export default function useTutorial() {
  const haTomadoTour = (modulo) =>
    localStorage.getItem(`${STORAGE_PREFIX}${modulo}`) === 'true';

  const iniciarTour = (modulo) => {
    const config = TUTORIALES[modulo];
    if (!config) return;

    const driverObj = driver({
      animate: true,
      overlayColor: 'rgba(15, 16, 35, 0.85)',
      smoothScroll: true,
      allowClose: true,
      nextBtnText: 'Siguiente →',
      prevBtnText: '← Anterior',
      doneBtnText: 'Entendido ✓',
      stagePadding: 8,
      stageRadius: 8,
      steps: config.pasos,
      onDestroyStarted: () => {
        localStorage.setItem(`${STORAGE_PREFIX}${modulo}`, 'true');
        driverObj.destroy();
      },
    });

    driverObj.drive();
  };

  return { iniciarTour, haTomadoTour };
}
