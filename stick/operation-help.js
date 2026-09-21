// Instructions only: opening or closing this dialog never changes the board.
(()=>{
 const dialog=document.createElement('dialog');dialog.id='operationHelp';dialog.setAttribute('aria-labelledby','operationHelpTitle');
 dialog.innerHTML='<div class="operation-help-head"><small>HOW TO PLAY</small><h2 id="operationHelpTitle">キューブの操作</h2></div><ol class="operation-help-steps"><li><strong>ドラッグして見回す</strong><p>キューブを指やマウスで動かすと、裏側も見られます。手数は使いません。</p></li><li><strong>回したいパネルをタップ</strong><p>選んだパネルが赤く点滅します。マウスではクリックで選択します。</p></li><li><strong>トリガーで方向を決める</strong><p>右下の丸いスティックを上下・左右に動かし、離すと選んだパネルを含む列が1手回転します。中心に戻して離すとキャンセルできます。</p></li></ol><p class="operation-help-note">回転後は、パネルを選び直して続けます。<br>この説明は「操作」ボタンでいつでも確認できます。</p><button type="button" id="operationHelpClose">わかった・遊ぶ</button>';
 document.body.append(dialog);
 const button=document.createElement('button');button.id='operationHelpOpen';button.type='button';button.textContent='操作';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls',dialog.id);
 document.querySelector('.stick-instructions').append(button);
 button.onclick=()=>dialog.showModal();
 dialog.querySelector('#operationHelpClose').onclick=()=>dialog.close();
 dialog.addEventListener('keydown',e=>e.stopPropagation());
 // Native modal makes the board inert until the explanation is dismissed.
 dialog.showModal();
})();
