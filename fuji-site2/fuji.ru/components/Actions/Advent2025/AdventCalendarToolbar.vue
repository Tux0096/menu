<template>
  <div class="advent-calendar__toolbar">
    <button
      class="advent-calendar__toolbar-btn advent-calendar__toolbar-btn--back"
      @click="$emit('back')"
    >
      <svg
        fill="none"
        height="37"
        viewBox="0 0 33 37"
        width="33"
        xmlns="http://www.w3.org/2000/svg"
      >
        <foreignObject
          height="36.2546"
          width="33"
          x="0"
          y="0"
        >
          <div
            style="backdrop-filter:blur(2px);clip-path:url(#bgblur_0_2002_4043_clip_path);height:100%;width:100%"
            xmlns="http://www.w3.org/1999/xhtml"
          />
        </foreignObject>
        <g
          data-figma-bg-blur-radius="4"
          filter="url(#filter0_di_2002_4043)"
        >
          <path
            d="M5 19.8594C3.66666 19.0896 3.66667 17.1651 5 16.3953L26 4.27091C27.3333 3.50111 29 4.46336 29 6.00296L29 30.2517C29 31.7913 27.3333 32.7535 26 31.9837L5 19.8594Z"
            fill="url(#paint0_linear_2002_4043)"
            fill-opacity="0.75"
          />
          <path
            d="M5 19.8594C3.66666 19.0896 3.66667 17.1651 5 16.3953L26 4.27091C27.3333 3.50111 29 4.46336 29 6.00296L29 30.2517C29 31.7913 27.3333 32.7535 26 31.9837L5 19.8594Z"
            fill="url(#paint1_linear_2002_4043)"
          />
          <path
            d="M5.125 19.6429C3.95833 18.9694 3.95833 17.2853 5.125 16.6117L26.125 4.48767C27.2917 3.81409 28.75 4.65614 28.75 6.00329L28.75 30.2513C28.75 31.5985 27.2917 32.4405 26.125 31.767L5.125 19.6429Z"
            stroke="url(#paint2_linear_2002_4043)"
            stroke-opacity="0.75"
            stroke-width="0.5"
          />
        </g>
        <defs>
          <filter
            id="filter0_di_2002_4043"
            color-interpolation-filters="sRGB"
            filterUnits="userSpaceOnUse"
            height="36.2546"
            width="33"
            x="0"
            y="0"
          >
            <feFlood
              flood-opacity="0"
              result="BackgroundImageFix"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="2" />
            <feComposite
              in2="hardAlpha"
              operator="out"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.32 0"
            />
            <feBlend
              in2="BackgroundImageFix"
              mode="plus-lighter"
              result="effect1_dropShadow_2002_4043"
            />
            <feBlend
              in="SourceGraphic"
              in2="effect1_dropShadow_2002_4043"
              mode="normal"
              result="shape"
            />
            <feColorMatrix
              in="SourceAlpha"
              result="hardAlpha"
              type="matrix"
              values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            />
            <feOffset />
            <feGaussianBlur stdDeviation="1" />
            <feComposite
              in2="hardAlpha"
              k2="-1"
              k3="1"
              operator="arithmetic"
            />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.25 0"
            />
            <feBlend
              in2="shape"
              mode="normal"
              result="effect2_innerShadow_2002_4043"
            />
          </filter>
          <clipPath
            id="bgblur_0_2002_4043_clip_path"
            transform="translate(0 0)"
          >
            <path
              d="M5 19.8594C3.66666 19.0896 3.66667 17.1651 5 16.3953L26 4.27091C27.3333 3.50111 29 4.46336 29 6.00296L29 30.2517C29 31.7913 27.3333 32.7535 26 31.9837L5 19.8594Z"
            />
          </clipPath>
          <linearGradient
            id="paint0_linear_2002_4043"
            gradientUnits="userSpaceOnUse"
            x1="2"
            x2="38"
            y1="18.1273"
            y2="18.1273"
          >
            <stop stop-color="#0D1730" />
            <stop
              offset="1"
              stop-color="#0B1225"
            />
          </linearGradient>
          <linearGradient
            id="paint1_linear_2002_4043"
            gradientUnits="userSpaceOnUse"
            x1="28.3077"
            x2="25.1096"
            y1="42.8933"
            y2="-4.14472"
          >
            <stop stop-color="white" />
            <stop
              offset="0.475962"
              stop-color="#DAE7FF"
            />
            <stop
              offset="1"
              stop-color="#AFDBFF"
            />
          </linearGradient>
          <linearGradient
            id="paint2_linear_2002_4043"
            gradientUnits="userSpaceOnUse"
            x1="2"
            x2="38"
            y1="18.1273"
            y2="18.1273"
          >
            <stop stop-color="#0D1730" />
            <stop
              offset="1"
              stop-color="#0B1225"
            />
          </linearGradient>
        </defs>
      </svg>
      <span>
        Назад
      </span>
    </button>

    <button
      class="advent-calendar__toolbar-btn advent-calendar__toolbar-btn--info"
      @click="$router.push('/advent-2025/legal')"
    >
      <svg
        fill="none"
        height="12"
        viewBox="0 0 7 12"
        width="7"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M4.04793 7.79199V8.35199H2.54393V7.58399C2.54393 7.06133 2.6346 6.62933 2.81593 6.28799C3.00793 5.93599 3.3066 5.57333 3.71193 5.19999L4.30393 4.63999C4.84793 4.17066 5.11993 3.64266 5.11993 3.05599C5.11993 2.54399 4.9546 2.13866 4.62393 1.83999C4.30393 1.53066 3.88793 1.37599 3.37593 1.37599C2.86393 1.37599 2.4426 1.54666 2.11193 1.88799C1.78127 2.21866 1.58927 2.63466 1.53593 3.13599L-6.63996e-05 2.95999C0.1386 2.05333 0.5226 1.33333 1.15193 0.799993C1.78127 0.266659 2.5546 -7.62939e-06 3.47193 -7.62939e-06C4.39993 -7.62939e-06 5.17327 0.261326 5.79193 0.783993C6.4106 1.30666 6.71993 2.03199 6.71993 2.95999C6.71993 3.57866 6.59727 4.07466 6.35193 4.44799C6.11727 4.82133 5.72793 5.23733 5.18393 5.69599C4.72527 6.09066 4.42127 6.41599 4.27193 6.67199C4.1226 6.91733 4.04793 7.29066 4.04793 7.79199ZM4.12793 9.87199C4.34127 10.0747 4.44793 10.32 4.44793 10.608C4.44793 10.896 4.34127 11.1467 4.12793 11.36C3.92527 11.5627 3.6746 11.664 3.37593 11.664C3.07727 11.664 2.82127 11.5627 2.60793 11.36C2.40527 11.1467 2.30393 10.9013 2.30393 10.624C2.30393 10.336 2.40527 10.0907 2.60793 9.88799C2.82127 9.67466 3.07727 9.56799 3.37593 9.56799C3.6746 9.56799 3.92527 9.66933 4.12793 9.87199Z"
          fill="url(#paint0_linear_439_1673)"
        />
        <defs>
          <linearGradient
            id="paint0_linear_439_1673"
            gradientUnits="userSpaceOnUse"
            x1="3.23193"
            x2="3.23193"
            y1="-4.43201"
            y2="15.568"
          >
            <stop stop-color="#0D1730" />
            <stop
              offset="1"
              stop-color="#0B1225"
            />
          </linearGradient>
        </defs>
      </svg>
    </button>
  </div>
</template>

<script>
export default {
  name: 'AdventCalendarToolbar',
};
</script>

<style lang="scss" scoped>
// .advent-calendar__toolbar
.advent-calendar__toolbar {
  position: absolute;
  z-index: 10;
  top: 0;
  right: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: extClamp(21) extClamp(16) extClamp(7);

  @media screen and (min-width: 768px) {
    padding: 21px 16px 19px;
  }
  @media screen and (min-width: 1280px) {
    width: 100%;
    max-width: 1152px;
    margin: 0 auto;
  }
}

.advent-calendar__toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: extClamp(28);
  transition: transform 0.2s;
  border: none;
  background: transparent;
  gap: extClamp(13);

  @media screen and (min-width: 768px) {
    height: 36px;
    gap: 13px;
  }

  svg {
    width: 100%;
    height: 100%;
  }

  > span {
    font-family: "Avenir Next Cyr", sans-serif;
    font-size: extClamp(20);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    display: block;
    background: linear-gradient(86deg, #fff -15.88%, #dae7ff 42.62%, #afdbff 107.02%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;

    @media screen and (min-width: 768px) {
      font-size: 24px;
    }
  }

  // .advent-calendar__toolbar-btn--info
  &--info {
    width: extClamp(32);
    height: extClamp(32);
    color: #0c152b;
    border: 1px solid #0d1730;
    border-radius: 50%;
    background: linear-gradient(86deg, #fff -15.88%, #dae7ff 42.62%, #afdbff 107.02%), linear-gradient(180deg, rgba(13, 23, 48, 0.75) 0%, rgba(11, 18, 37, 0.75) 100%);
    box-shadow: 0 0 2px 0 rgba(255, 255, 255, 0.25) inset, 0 0 4px 0 rgba(255, 255, 255, 0.32);
    backdrop-filter: blur(2px);

    @media screen and (min-width: 768px) {
      width: 48px;
      height: 48px;
    }

    svg {
      width: extClamp(8);
      height: extClamp(20);

      @media screen and (min-width: 768px) {
        width: 12px;
        height: 28px;
      }
    }
  }
}
</style>
