let originalImage = null;
let currentSettings = {
  width: 0,
  height: 0,
  orientation: "horizontal",
};
let scale = 1;
const previewContainer = document.querySelector(".preview-container");
const previewWrapper = document.getElementById("previewWrapper");

// 添加拖动功能
let isDragging = false;
let startX, startY, scrollLeft, scrollTop;

previewContainer.addEventListener("mousedown", function (e) {
  isDragging = true;
  startX = e.pageX - previewContainer.offsetLeft;
  startY = e.pageY - previewContainer.offsetTop;
  scrollLeft = previewContainer.scrollLeft;
  scrollTop = previewContainer.scrollTop;
});

previewContainer.addEventListener("mouseleave", function () {
  isDragging = false;
});

previewContainer.addEventListener("mouseup", function () {
  isDragging = false;
});

previewContainer.addEventListener("mousemove", function (e) {
  if (!isDragging) return;

  e.preventDefault();
  const x = e.pageX - previewContainer.offsetLeft;
  const y = e.pageY - previewContainer.offsetTop;
  const walkX = x - startX;
  const walkY = y - startY;

  previewContainer.scrollLeft = scrollLeft - walkX;
  previewContainer.scrollTop = scrollTop - walkY;
});

// 预览图片
document.getElementById("imageInput").addEventListener("change", function (e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      originalImage = new Image();
      originalImage.onload = function () {
        const previewImg = document.getElementById("previewImage");
        const previewContainer = document.querySelector(".preview-container");

        previewImg.src = event.target.result;

        // 重置缩放
        scale = 1;

        // 计算适合的初始显示大小
        const containerWidth = previewContainer.clientWidth;
        const containerHeight = previewContainer.clientHeight;
        const imgAspectRatio = originalImage.width / originalImage.height;
        const containerAspectRatio = containerWidth / containerHeight;

        if (imgAspectRatio > containerAspectRatio) {
          previewImg.style.width = "90vw";
          previewImg.style.height = "auto";
        } else {
          previewImg.style.width = "auto";
          previewImg.style.height = "80vh";
        }

        // 计算wrapper的初始位置，确保图片居中
        const wrapperWidth = Math.max(containerWidth, previewImg.offsetWidth);
        const wrapperHeight = Math.max(
          containerHeight,
          previewImg.offsetHeight
        );

        // 设置wrapper的尺寸
        previewWrapper.style.width = `${wrapperWidth}px`;
        previewWrapper.style.height = `${wrapperHeight}px`;

        // 计算并设置wrapper的位置，使其居中
        const leftOffset = (wrapperWidth - containerWidth) / 2;
        const topOffset = (wrapperHeight - containerHeight) / 2;

        previewWrapper.style.left = `${-leftOffset}px`;
        previewWrapper.style.top = `${-topOffset}px`;

        // 应用变换
        previewWrapper.style.transform = `scale(${scale})`;

        // 重置滚动位置到中心
        previewContainer.scrollLeft =
          (previewWrapper.offsetWidth * scale - containerWidth) / 2;
        previewContainer.scrollTop =
          (previewWrapper.offsetHeight * scale - containerHeight) / 2;

        // 清除现有网格
        document
          .getElementById("previewWrapper")
          .querySelectorAll(".grid-overlay")
          .forEach((el) => el.remove());

        // 设置默认值
        document.getElementById("width").value = Math.min(
          1920,
          originalImage.width
        );
        document.getElementById("height").value = Math.min(
          1000,
          originalImage.height
        );
      };
      originalImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }
});

// 修改缩放逻辑
previewContainer.addEventListener("wheel", function (e) {
  e.preventDefault();

  const rect = previewContainer.getBoundingClientRect();
  const mouseX = e.clientX - rect.left;
  const mouseY = e.clientY - rect.top;

  const scrollLeftBefore = previewContainer.scrollLeft;
  const scrollTopBefore = previewContainer.scrollTop;

  const delta = e.deltaY;
  const scaleChange = delta > 0 ? 0.9 : 1.1;
  const oldScale = scale;
  scale *= scaleChange;
  scale = Math.min(Math.max(0.5, scale), 5);

  // 更新图片和网格的缩放
  previewWrapper.style.transform = `scale(${scale})`;

  // 计算新的滚动位置
  const scrollLeftAfter =
    (scrollLeftBefore + mouseX) * (scale / oldScale) - mouseX;
  const scrollTopAfter =
    (scrollTopBefore + mouseY) * (scale / oldScale) - mouseY;

  previewContainer.scrollLeft = scrollLeftAfter;
  previewContainer.scrollTop = scrollTopAfter;

  // 使用 requestAnimationFrame 确保平滑更新
  requestAnimationFrame(() => {
    if (currentSettings.width > 0) {
      updateGridOverlay();
    }
  });
});

// 更新网格预览（优化性能）
function updateGridOverlay() {
  const wrapper = document.getElementById("previewWrapper");
  const previewImg = document.getElementById("previewImage");
  wrapper.querySelectorAll(".grid-overlay").forEach((el) => el.remove());

  if (!originalImage || !previewImg.complete) return;

  const width = currentSettings.width;
  const height = currentSettings.height;
  const orientation = currentSettings.orientation;

  // 计算图片的实际显示尺寸
  const displayWidth = previewImg.offsetWidth;
  const displayHeight = previewImg.offsetHeight;

  // 计算基础缩放比例（不包含当前的scale值）
  const baseScaleX = displayWidth / originalImage.width;
  const baseScaleY = displayHeight / originalImage.height;

  const maxGrids = 1000;
  let gridCount = 0;

  let x = 0,
    y = 0;

  // 创建一个文档片段来提高性能
  const fragment = document.createDocumentFragment();

  while (gridCount < maxGrids) {
    if (y >= originalImage.height) break;

    const overlay = document.createElement("div");
    overlay.className = "grid-overlay";

    const drawWidth =
      orientation === "horizontal"
        ? Math.min(width, originalImage.width - x)
        : width;
    const drawHeight = Math.min(height, originalImage.height - y);

    // 计算网格位置和大小（使用基础缩放比例）
    overlay.style.left = `${x * baseScaleX}px`;
    overlay.style.top = `${y * baseScaleY}px`;
    overlay.style.width = `${drawWidth * baseScaleX}px`;
    overlay.style.height = `${drawHeight * baseScaleY}px`;

    fragment.appendChild(overlay);
    gridCount++;

    if (orientation === "horizontal") {
      x += width;
      if (x >= originalImage.width) {
        x = 0;
        y += height;
      }
    } else {
      y += height;
    }
  }

  // 创建一个容器来包含所有网格
  const gridContainer = document.createElement("div");
  gridContainer.className = "grid-container";
  gridContainer.style.position = "absolute";
  gridContainer.style.left = `${(wrapper.offsetWidth - displayWidth) / 2}px`;
  gridContainer.style.top = `${(wrapper.offsetHeight - displayHeight) / 2}px`;
  gridContainer.style.width = `${displayWidth}px`;
  gridContainer.style.height = `${displayHeight}px`;
  gridContainer.style.transformOrigin = "0 0";

  // 将所有网格添加到容器中
  gridContainer.appendChild(fragment);
  wrapper.appendChild(gridContainer);

  if (gridCount >= maxGrids) {
    console.warn("网格数量超过限制，部分网格未显示");
  }
}

// 确保图片加载完成后再更新网格
document.getElementById("previewImage").addEventListener("load", function () {
  if (currentSettings.width > 0) {
    updateGridOverlay();
  }
});

// 更新确定设置按钮的处理逻辑
document.getElementById("applySettings").addEventListener("click", function () {
  if (!originalImage) {
    alert("请先选择图片文件");
    return;
  }

  const width = parseInt(document.getElementById("width").value);
  const height = parseInt(document.getElementById("height").value);
  const orientation = document.getElementById("orientation").value;

  if (!width || !height || width <= 0 || height <= 0) {
    alert("请输入有效的宽度和高度");
    return;
  }

  // 计算网格数量
  let gridCount;
  if (orientation === "horizontal") {
    gridCount =
      Math.ceil(originalImage.width / width) *
      Math.ceil(originalImage.height / height);
  } else {
    // 纵向只考虑高度方向的分割
    gridCount = Math.ceil(originalImage.height / height);
  }

  if (gridCount > 1000) {
    alert("当前设置会产生过多的页面（" + gridCount + "页），请调整设置");
    return;
  }

  currentSettings = {
    width: width,
    height: height,
    orientation: orientation,
  };

  requestAnimationFrame(() => {
    updateGridOverlay();
  });
});

// 更新导出按钮的处理逻辑
document
  .getElementById("exportBtn")
  .addEventListener("click", async function () {
    if (!originalImage) {
      alert("请先选择图片文件");
      return;
    }

    const width = currentSettings.width;
    const height = currentSettings.height;
    const orientation = currentSettings.orientation;

    const { jsPDF } = window.jspdf;

    if (orientation === "horizontal") {
      // 横向裁切逻辑保持不变
      const pdf = new jsPDF("l", "px", [width, height]);
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = width;
      canvas.height = height;

      let x = 0,
        y = 0;
      let isFirstPage = true;

      while (y < originalImage.height) {
        ctx.clearRect(0, 0, width, height);
        const drawWidth = Math.min(width, originalImage.width - x);
        const drawHeight = Math.min(height, originalImage.height - y);

        ctx.drawImage(
          originalImage,
          x,
          y,
          drawWidth,
          drawHeight,
          0,
          0,
          drawWidth,
          drawHeight
        );

        const imgData = canvas.toDataURL("image/jpeg", 1.0);
        if (!isFirstPage) {
          pdf.addPage([width, height], "l");
        }
        pdf.addImage(imgData, "JPEG", 0, 0, drawWidth, drawHeight);
        isFirstPage = false;

        x += width;
        if (x >= originalImage.width) {
          x = 0;
          y += height;
        }
      }
      pdf.save("output.pdf");
    } else {
      // 纵向裁切逻辑
      const pdf = new jsPDF("p", "px", [width, height]);
      let y = 0;
      let isFirstPage = true;

      // 计算总页数
      const totalPages = Math.ceil(originalImage.height / height);

      for (let page = 0; page < totalPages; page++) {
        const drawHeight = Math.min(height, originalImage.height - y);

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = drawHeight; // 使用实际高度

        const ctx = canvas.getContext("2d");
        ctx.drawImage(
          originalImage,
          0,
          y,
          width,
          drawHeight, // 源图像区域
          0,
          0,
          width,
          drawHeight // 目标区域
        );

        const imgData = canvas.toDataURL("image/jpeg", 1.0);

        if (!isFirstPage) {
          pdf.addPage([width, height], "p");
        }

        // 将图像放置在PDF页面的顶部
        pdf.addImage(imgData, "JPEG", 0, 0, width, drawHeight);
        isFirstPage = false;

        y += height;
      }

      pdf.save("output.pdf");
    }
});
