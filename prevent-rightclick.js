// Simple right-click prevention
document.addEventListener('contextmenu', function(e) {
    console.log('Preventing default right-click');
    e.preventDefault();
    return false;
});
