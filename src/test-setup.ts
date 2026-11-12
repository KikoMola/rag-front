// jsdom no implementa la Web Animations API. ng-primitives llama a getAnimations()
// al cerrar diálogos y overlays para esperar a su animación de salida; sin esto,
// los tests que dejan un diálogo abierto fallan al desmontarse.
if (typeof Element !== 'undefined' && !Element.prototype.getAnimations) {
    Element.prototype.getAnimations = () => [];
}
