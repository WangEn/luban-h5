import { mapState, mapActions } from 'vuex'
import './index.scss'
import { swapZindex } from '@/utils/element'

function getTreeNode (ele) {
  return {
    title: ele.name,
    uuid: ele.uuid,
    key: ele.uuid,
    disabled: ele.name === 'lbp-background', // 背景元素禁用，不允许拖拽
    scopedSlots: { title: 'title' },
    children: (ele.children || []).map(getTreeNode)
  }
}

function sortElementsByZIndex (elements) {
  return elements.sort((a, b) => {
    const zIndexA = a.commonStyle?.zindex || 0
    const zIndexB = b.commonStyle?.zindex || 0
    return zIndexB - zIndexA // 逆序：z-index 高的在前
  })
}

export default {
  name: 'PageTree',
  computed: {
    ...mapState('editor', {
      elements: state => state.editingPage.elements,
      editingElement: state => state.editingElement,
    }),
    treeData () {
      // 按照 zIndex 逆序排序（z-index 高的在前）
      const sortedElements = sortElementsByZIndex([...this.elements])
      return sortedElements.map(getTreeNode)
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
        ...element.getProps({ previewPureText: true }),
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
      const elementName = (element ? element.name : '').replace('lbp-', '')
      // console.log('element', element)
      console.log('elementName', elementName)
      // const elementUuid = element ? element.uuid : null
      const shouldRender = element && element.name !== 'lbp-background'

      // if (element.name === 'lbp-background') {
      //   return h('lbp-background', {
      //     props: element.getProps()
      //   })
      // }
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
          ...element.getProps({ previewPureText: true }), // #6 #3,
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
          <div class="tree-node-label"><a-tag size="small">{elementName}</a-tag></div>
          <div class="tree-node-preview">
            {shouldRender && h(element.uuid, data)}
          </div>
        </div>
      )
    },
    onDragEnter (info) {
    },
    /**
     * 
     * @param {*} info Ant Design Vue Tree 的 onDrop 事件参数
     * @returns void
     * 
     * 
     * - info.dragNode: 被拖拽的节点对象
     * - info.node: 目标节点对象
     * - info.dropPosition: 拖拽位置(-1最上方的位置)
     * 
     * 
     *               <- dropdropPosition: -1
     * --第一个节点--- <- dropToGap: false(即拖拽到节点上面；按照 tree 的话，是内部，即嵌套节点；目前不需要，所以处理成替换)
     *               <- dropdropPosition: 0
     * --第二个节点---
     *               <- dropdropPosition: 1
     * --第三个节点---
     *               <- dropdropPosition: 2(即拖拽到节点间隙，gap 的 index，从 0 开始)
     * --第四个节点---
     */
    onDrop (info) {
      // - info.dropToGap: 是否拖拽到节点间隙（true: 间隙, false: 节点内部）
      const { dragNode, node, dropPosition, dropToGap } = info
      const replaceNode = !dropToGap
      
      if (!dragNode || !node) return

      // 排序的原因，是为了保持和展示的 treeNode 排序一致，否则会导致 dragIndex、targetIndex、dropPosition 取值有问题
      const sortedElements = sortElementsByZIndex([...this.elements])
      
      const dragKey = dragNode.eventKey
      const targetKey = node.eventKey

      // 找到拖拽元素和目标元素在列表中的索引
      const dragIndex = sortedElements.findIndex(el => el.uuid === dragKey)
      const targetIndex = sortedElements.findIndex(el => el.uuid === targetKey)

      const dragElement = sortedElements[dragIndex]
      const targetElement = sortedElements[targetIndex]

      if (replaceNode) {
        swapZindex(dragElement, targetElement)
      } else {
        const length = sortedElements.length
        // 从原位置移除拖拽元素
        sortedElements.splice(dragIndex, 1)
        // 计算新位置
        let newIndex = dropPosition + 1 // +1 的原因：非替换元素的话，起始节点是 -1，非 0，因此 +1 对齐常规数组索引
        // 插入到新位置
        sortedElements.splice(newIndex, 0, dragElement)
        // 更新所有元素的 z-index（从 1 开始，背景元素保持 -1 或 0）
        sortedElements.forEach((element, index) => {
          element.commonStyle.zindex = length - index
        })
      }
      
      // 使用 elementManager 的 reOrder 类型来更新元素顺序
      this.elementManager({
        type: 'reOrder',
        value: { newElements: sortedElements }
      })
      // 如果拖拽的元素是当前选中的元素，保持选中状态
      if (this.editingElement && this.editingElement.uuid === dragKey) {
        this.setEditingElement(draggedElement)
      }
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

