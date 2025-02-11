import {
  MapType,
  getMapInfo
} from '../../../helpers/location'
import getRealPath from 'uni-platform/helpers/get-real-path'

const mapInfo = getMapInfo()
const ISAMAP = mapInfo.type === MapType.AMAP

export default {
  props: {
    id: {
      type: [Number, String],
      default: ''
    },
    latitude: {
      type: [Number, String],
      require: true
    },
    longitude: {
      type: [Number, String],
      require: true
    },
    title: {
      type: String,
      default: ''
    },
    iconPath: {
      type: String,
      require: true
    },
    rotate: {
      type: [Number, String],
      default: 0
    },
    alpha: {
      type: [Number, String],
      default: 1
    },
    width: {
      type: [Number, String],
      default: ''
    },
    height: {
      type: [Number, String],
      default: ''
    },
    callout: {
      type: Object,
      default: null
    },
    label: {
      type: Object,
      default: null
    },
    anchor: {
      type: Object,
      default: null
    },
    clusterId: {
      type: [Number, String],
      default: ''
    },
    customCallout: {
      type: Object,
      default: null
    },
    ariaLabel: {
      type: String,
      default: ''
    }
  },
  data () {
    return {
      idString: String(isNaN(Number(this.id)) ? '' : this.id)
    }
  },
  mounted () {
    const $parent = this.$parent
    $parent.mapReady(() => {
      this._maps = $parent._maps
      this._map = $parent._map
      this.addMarker(this.$props)
      Object.keys(this.$props).forEach(key => {
        this.$watch(key, () => {
          this.updateMarker(this.$props)
        })
      })
    })
  },
  beforeDestroy () {
    this.removeMarker()
  },
  methods: {
    addMarker (props) {
      const maps = this._maps
      const map = this._map
      const marker = this._marker = new maps.Marker({
        map,
        flat: true,
        autoRotation: false
      })
      this.$parent._markers[this.idString] = marker
      this.updateMarker(props)
      maps.event.addListener(marker, 'click', (e) => {
        const callout = marker.callout
        if (callout && !callout.alwaysVisible) {
          if (ISAMAP) {
            callout.visible = !callout.visible
            if (callout.visible) {
              marker.callout.createAMapText()
            } else {
              marker.callout.removeAMapText()
            }
          } else {
            callout.set('visible', !callout.visible)
            if (callout.visible) {
              const div = callout.div
              const parent = div.parentNode
              parent.removeChild(div)
              parent.appendChild(div)
            }
          }
        }
        if (this.idString) {
          const { latitude, longitude } = this.getMarkerLatitudeLongitude(e)
          this.$parent.$trigger('markertap', {}, {
            markerId: Number(this.idString),
            latitude,
            longitude
          })
        }

        const event = e.event || e.domEvent || e.originEvent
        event.stopPropagation()
      })
    },
    updateMarker (option) {
      const map = this._map
      const maps = this._maps
      const marker = this._marker
      const title = option.title
      const position = ISAMAP ? new maps.LngLat(option.longitude, option.latitude) : new maps.LatLng(option.latitude, option.longitude)
      const img = new Image()
      img.onload = () => {
        const anchor = option.anchor || {}
        let icon
        let w
        let h
        const x = typeof anchor.x === 'number' ? anchor.x : 0.5
        const y = typeof anchor.y === 'number' ? anchor.y : 1
        if (option.iconPath && (option.width || option.height)) {
          w = option.width || (img.width / img.height) * option.height
          h = option.height || (img.height / img.width) * option.width
        } else {
          w = img.width / 2
          h = img.height / 2
        }
        const top = h - (h - y * h)
        if ('MarkerImage' in maps) {
          // 腾讯 & google
          icon = new maps.MarkerImage(
            img.src,
            null,
            null,
            new maps.Point(x * w, y * h),
            new maps.Size(w, h)
          )
        } else if ('Icon' in maps) {
          // 高德
          icon = new maps.Icon({
            image: img.src,
            size: new maps.Size(w, h),
            imageSize: new maps.Size(w, h),
            imageOffset: new maps.Pixel(x * w, y * h)
          })
        } else {
          icon = {
            url: img.src,
            anchor: new maps.Point(x, y),
            size: new maps.Size(w, h)
          }
        }
        marker.setPosition(position)
        marker.setIcon(icon)
        if ('setRotation' in marker) {
          marker.setRotation(option.rotate || 0)
        }
        const labelOpt = option.label || {}
        if ('label' in marker) {
          marker.label.setMap(null)
          delete marker.label
        }
        let label
        if (labelOpt.content) {
          const labelStyle = {
            borderColor: labelOpt.borderColor,
            borderWidth: (Number(labelOpt.borderWidth) || 0) + 'px',
            padding: (Number(labelOpt.padding) || 0) + 'px',
            borderRadius: (Number(labelOpt.borderRadius) || 0) + 'px',
            backgroundColor: labelOpt.bgColor,
            color: labelOpt.color,
            fontSize: (labelOpt.fontSize || 14) + 'px',
            lineHeight: (labelOpt.fontSize || 14) + 'px',
            marginLeft: (Number(labelOpt.anchorX || labelOpt.x) || 0) + 'px',
            marginTop: (Number(labelOpt.anchorY || labelOpt.y) || 0) + 'px'
          }
          if ('Label' in maps) {
            // 腾讯
            label = new maps.Label({
              position,
              map: map,
              clickable: false,
              content: labelOpt.content,
              style: labelStyle
            })
            marker.label = label
          } else if ('setLabel' in marker) {
            // 高德
            if (ISAMAP) {
              const content =
              `<div style="
                margin-left:${labelStyle.marginLeft};
                margin-top:${labelStyle.marginTop};
                padding:${labelStyle.padding};
                background-color:${labelStyle.backgroundColor};
                border-radius:${labelStyle.borderRadius};
                line-height:${labelStyle.lineHeight};
                color:${labelStyle.color};
                font-size:${labelStyle.fontSize};

                ">
                ${labelOpt.content}
              <div>`
              marker.setLabel({
                content,
                direction: 'bottom-right'
              })
            } else {
              // google
              const className = this.updateMarkerLabelStyle(this.idString, labelStyle)
              marker.setLabel({
                text: labelOpt.content,
                color: labelStyle.color,
                fontSize: labelStyle.fontSize,
                className
              })
            }
          }
        }
        const calloutOpt = option.callout || {}
        let callout = marker.callout
        let calloutStyle
        if (calloutOpt.content || title) {
          const boxShadow = '0px 0px 3px 1px rgba(0,0,0,0.5)'
          calloutStyle = calloutOpt.content
            ? {
              position,
              map,
              top,
              // handle AMap callout offset
              offsetY: -option.height / 2,
              content: calloutOpt.content,
              color: calloutOpt.color,
              fontSize: calloutOpt.fontSize,
              borderRadius: calloutOpt.borderRadius,
              bgColor: calloutOpt.bgColor,
              padding: calloutOpt.padding,
              boxShadow: calloutOpt.boxShadow || boxShadow,
              display: calloutOpt.display
            }
            : {
              position,
              map,
              top,
              offsetY: -option.height / 2,
              content: title,
              boxShadow: boxShadow
            }
          if (callout) {
            callout.setOption(calloutStyle)
          } else {
            if (ISAMAP) {
              const callback = (self) => {
                if (self.idString) {
                  self.$parent.$trigger('callouttap', {}, {
                    markerId: Number(self.idString)
                  })
                }
              }
              callout = marker.callout = new maps.Callout(calloutStyle, callback, this)
            } else {
              callout = marker.callout = new maps.Callout(calloutStyle)
              callout.div.onclick = ($event) => {
                if (this.idString) {
                  this.$parent.$trigger('callouttap', $event, {
                    markerId: Number(this.idString)
                  })
                }
                $event.stopPropagation()
                $event.preventDefault()
              }
            }
          }
        } else {
          if (callout) {
            this.removeMarkerCallout(marker.callout)
            delete marker.callout
          }
        }
      }
      if (option.iconPath) {
        img.src = getRealPath(option.iconPath)
      } else {
        console.error('Marker.iconPath is required.')
      }
    },
    updateMarkerLabelStyle (id, style) {
      const className = 'uni-map-marker-label-' + id
      let styleEl = document.getElementById(className)
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = className
        document.head.appendChild(styleEl)
        this.$once('hook:destroyed', () => {
          styleEl.remove()
        })
      }
      const newStyle = Object.assign({}, style, {
        position: 'absolute',
        top: '70px',
        borderStyle: 'solid'
      })
      const div = document.createElement('div')
      Object.keys(newStyle).forEach(key => {
        div.style[key] = newStyle[key] || ''
      })
      styleEl.innerText = `.${className}{${div.getAttribute('style')}}`
      return className
    },
    getMarkerLatitudeLongitude (e) {
      let latitude
      let longitude

      if (ISAMAP) {
        latitude = e.lnglat.lat
        longitude = e.lnglat.lng
      } else if (mapInfo.type === MapType.QQ) {
        latitude = e.latLng.lat
        longitude = e.latLng.lng
      } else if (mapInfo.type === MapType.GOOGLE) {
        latitude = e.latLng.lat()
        longitude = e.latLng.lng()
      }
      return { latitude, longitude }
    },
    removeMarker () {
      const marker = this._marker
      if (marker) {
        if (marker.label && 'setMap' in marker.label) {
          marker.label.setMap(null)
        }
        if (marker.callout) {
          this.removeMarkerCallout(marker.callout)
        }
        marker.setMap(null)
      }
      delete this.$parent._markers[this.idString]
      this._marker = null
    },
    removeMarkerCallout (callout) {
      if (ISAMAP) {
        callout.removeAMapText()
      } else {
        callout.setMap(null)
      }
    }
  },
  render () {
    return null
  }
}
