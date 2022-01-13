import pic from '../images/2.webp'
import pic2 from '../images/2.jpeg'

import '../css/index.scss'

const $ = document.querySelector.bind(document);

preImgLoad(pic);
// preImgLoad(pic2);

function preImgLoad(url) {
  const oImg = new Image();

  oImg.src = url;
  oImg.onload = () => $('body').append(oImg);
}

@log
class Index {

}

function log(tar) {
  console.dir(tar);
  tar.len = 0;
}
