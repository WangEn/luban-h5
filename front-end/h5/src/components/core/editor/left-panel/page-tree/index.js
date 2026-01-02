import { mapState, mapActions } from 'vuex'
import './index.scss'

function getTreeNode (ele) {
  return {
    title: ele.name,
    key: ele.uuid,
    scopedSlots: { title: 'title' },
    children: (ele.children || []).map(getTreeNode)
  }
}

export default {
  name: 'PageTree',
  computed: {
    ...mapState('editor', {
      elements: state => state.editingPage.elements,
      editingElement: state => state.editingElement,
    }),
    treeData () {
      return this.elements.map(getTreeNode)
    },
    selectedKeys () {
      // 根据 editingElement 返回对应的 key，用于高亮选中的节点
      if (this.editingElement && this.editingElement.uuid) {
        return [this.editingElement.uuid]
      }
      return []
    }
  },
  data () {
    return {
      gData: [],
      expandedKeys: []
    }
  },
  methods: {
    ...mapActions('editor', [
      'setEditingElement',
      'setElementPosition',
      'setElementShape',
      'recordElementRect',
      'elementManager',
      'updateWork'
    ]),
    getElementByKey (key) {
      return this.elements.find(el => el.uuid === key)
    },
    getElementPreviewProps (key) {
      const element = this.getElementByKey(key)
      if (!element) return {}
      
      return {
        ...element.getProps(),
        editorMode: 'edit',
        isEditingElement: false
      }
    },
    getElementPreviewStyle (key) {
      return {
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        transform: 'scale(0.3)',
        transformOrigin: 'top left',
        overflow: 'hidden'
      }
    },
    renderTreeNodeTitle (h, key) {
      const element = this.getElementByKey(key)
      const elementName = element ? element.name : ''
      const elementUuid = element ? element.uuid : null
      const shouldRender = element && element.name !== 'lbp-background'

      if (element.name === 'lbp-background') {
        return h('lbp-background', {
          props: element.getProps()
        })
      }
      const isEditingElement = this.editingElement && this.editingElement.uuid === element.uuid
      const data = {
        style: {
          width: '100%',
          height: '100%'
        },
        // 添加 class 的原因：与 handleClickCanvasProp 配合,
        // 当点击编辑画布上的其它区域（clickEvent.target.classList 不包含下面的 className）的时候，设置 editingElement=null
        class: 'element-on-edit-canvas',
        props: {
          ...element.getProps(), // #6 #3,
        //   editorMode: 'edit',
          isEditingElement
        },
        // nativeOn: {
        //   contextmenu: e => {
        //     this.bindContextMenu(e)
        //   }
        // },
        // on: {
        //   // 高亮当前点击的元素
        //   click: () => {
        //     this.setEditingElement(element)
        //   }
        // //   input: ({ value, pluginName }) => {
        // //     if (pluginName === 'lbp-text') {
        // //       element.pluginProps.text = value
        // //     }
        // //   }
        // }
      }

      return (
        <div class="tree-node-content">
          {/* <div class="tree-node-label">{elementName}</div> */}
          <div class="tree-node-preview">
            {shouldRender && h(element.uuid, data)}
          </div>
        </div>
      )
    },
    onDragEnter (info) {
    },
    onDrop (info) {
    }
  },
  render (h) {
    return (
      <a-tree
        class="draggable-tree"
        defaultExpandedKeys={this.expandedKeys}
        selectedKeys={this.selectedKeys}
        draggable
        showLine
        multiple={false}
        treeData={this.treeData}
        scopedSlots={{
          title: ({ key }) => this.renderTreeNodeTitle(h, key),
        }}
        onSelect={(selectedKeys, info) => {
          const key = selectedKeys[0]
          const element = this.getElementByKey(key)
          debugger
          if (element) {
            this.setEditingElement(element)
          }
        }}
        onDragenter={this.onDragEnter}
        onDrop={this.onDrop}
      />
    )
  }
}

