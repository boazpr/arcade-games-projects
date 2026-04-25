function loadGame(name, btn){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  if(btn) btn.classList.add('active');

  fetch(name + '.html')
    .then(res=>res.text())
    .then(html=>{
      document.getElementById('game-container').innerHTML = html;

      // REMOVE old script
      const oldScript = document.getElementById('game-script');
      if(oldScript) oldScript.remove();

      // LOAD new script
      const script = document.createElement('script');
      script.src = name + '.js';
      script.id = 'game-script';

      // ✅ WAIT until script is loaded
      script.onload = () => {
        console.log(name + " loaded");
      };

      document.body.appendChild(script);
    });
}

// default load
window.onload = () => {
  loadGame('rps', document.querySelector('.tab-btn'));
};